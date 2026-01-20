# Bridge Architecture Changes

## Overview

This document summarizes the major architectural changes made to the Mirage-Solana bridge since the initial production deployment.

---

## Change: Sequence-Based Replay Protection

### What Changed

**Before (Hash-Based)**:
- Each bridge transaction created a permanent `MintRecord` account on Solana
- Replay protection relied on checking if a `MintRecord` PDA existed for a given burn hash
- A background "cleanup job" attempted to close old records after a 7-day waiting period

**After (Sequence-Based)**:
- Each bridge transaction is assigned a monotonically increasing **sequence number** by the Mirage chain
- A single `BridgeState` account stores a **bitmap** (1024-bit sliding window) tracking processed sequences
- `MintRecord` is now temporary—it exists only during signature accumulation and is **closed immediately** upon successful mint, refunding rent to the orchestrator

### Why

1. **Cost**: The old design had a permanent rent cost of ~0.00383 SOL (~$0.70) per transaction. The new design has **zero marginal cost**—rent is fully refunded.

2. **Security**: The 7-day cleanup window was security theater. An attacker with compromised validator keys could simply wait 7 days and replay the transaction. The bitmap approach is **cryptographically secure**—once a sequence is marked as processed, it can never be processed again.

3. **Simplicity**: The cleanup job was complex, error-prone, and required careful orchestration. The new design is self-cleaning with no background processes.

---

## Summary of File Changes

| Component | Change |
|-----------|--------|
| `state/bridge_state.rs` | **New** - Stores replay bitmap and last sequence |
| `state/mint_record.rs` | Modified - Now temporary, closed on completion |
| `instructions/mint.rs` | Modified - Checks bitmap, accepts sequence param, closes record on success |
| `instructions/close_mint_record.rs` | **Deleted** - No longer needed |
| `instructions/initialize.rs` | Modified - Initializes `BridgeState` |
| `utils/bitmap.rs` | **New** - Bitmap manipulation helpers |
| `errors.rs` | Modified - Added `TransactionTooOld`, `AlreadyMinted` |

---

## Migration Notes

Since `BridgeState` is a new account type, existing deployments require one of:

1. **Re-initialization** (devnet): Deploy fresh or run `initialize` on a new program ID
2. **Migration instruction** (mainnet): Add a one-time `migrate_to_v2` instruction that creates `BridgeState`

The Mirage chain and Orchestrator must also be upgraded to emit and propagate sequence numbers.
