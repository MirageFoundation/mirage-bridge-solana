# Mirage Bridge - Technical Specification

## Table of Contents

1. [Overview](#overview)
2. [Token Details](#token-details)
3. [Architecture](#architecture)
4. [Account Structures](#account-structures)
5. [Instructions](#instructions)
6. [Events](#events)
7. [Security Model](#security-model)
8. [Orchestrator Integration](#orchestrator-integration)
9. [Security Checklist](#security-checklist)
10. [Testing Checklist](#testing-checklist)

---

## Overview

The Mirage Bridge enables bidirectional transfer of MIRAGE tokens between the Mirage blockchain and Solana. It uses a **validator-attested model** where Mirage validators run orchestrators that watch both chains and relay messages.

### Flow Diagrams

```
INBOUND FLOW (Solana → Mirage)
┌──────────────┐     ┌────────────────────┐     ┌──────────────────┐
│ User burns   │ ──▶ │ BurnInitiated      │ ──▶ │ Orchestrators    │
│ on Solana    │     │ event emitted      │     │ attest on Mirage │
└──────────────┘     └────────────────────┘     └────────┬─────────┘
                                                         │
                     ┌────────────────────┐              │
                     │ Mirage mints when  │ ◀────────────┘
                     │ 66.67% attested    │
                     └────────────────────┘

OUTBOUND FLOW (Mirage → Solana)
┌──────────────┐     ┌────────────────────┐     ┌──────────────────┐
│ User burns   │ ──▶ │ Orchestrators see  │ ──▶ │ Each orchestrator│
│ on Mirage    │     │ burn event         │     │ calls mint()     │
└──────────────┘     └────────────────────┘     └────────┬─────────┘
                                                         │
                     ┌────────────────────┐              │
                     │ Solana mints when  │ ◀────────────┘
                     │ 66.67% attested    │
                     └────────────────────┘
```

---

## Token Details

| Property | Value |
|----------|-------|
| Token Name | MIRAGE |
| Symbol | MIRAGE |
| Decimals | 6 (same as native MIRAGE: 1 MIRAGE = 1,000,000 umirage) |
| Type | SPL Token |
| Mint Authority | Bridge Config PDA |

---

## Architecture

### PDA Seeds

| PDA | Seeds | Description |
|-----|-------|-------------|
| `bridge_config` | `[b"bridge_config"]` | Global bridge configuration |
| `validator_registry` | `[b"validator_registry"]` | List of authorized validators |
| `mint` | `[b"mint"]` | MIRAGE SPL token mint |
| `mint_record` | `[b"mint_record", burn_tx_hash]` | Tracks attestations per Mirage burn |
| `burn_record` | `[b"burn_record", burn_nonce_le_bytes]` | Records each Solana burn |

### Constants

```rust
pub const MAX_VALIDATORS: usize = 10;      // Max validators in registry
pub const MAX_ATTESTORS: usize = 10;       // Max attestors per mint
pub const BASIS_POINTS_DENOMINATOR: u64 = 10_000;
pub const DEFAULT_THRESHOLD: u64 = 6_667;  // 66.67%
```

---

## Account Structures

### BridgeConfig

Global configuration for the bridge.

```rust
#[account]
pub struct BridgeConfig {
    pub authority: Pubkey,           // Can update config, pause bridge
    pub mint: Pubkey,                // MIRAGE token mint address
    pub mirage_chain_id: String,     // "mirage-1"
    pub attestation_threshold: u64,  // 6667 = 66.67% (basis points)
    pub total_minted: u64,           // Lifetime minted on Solana
    pub total_burned: u64,           // Lifetime burned on Solana
    pub burn_nonce: u64,             // Auto-incrementing burn ID
    pub paused: bool,                // Emergency pause flag
    pub bump: u8,                    // PDA bump seed
}
```

### ValidatorRegistry

Stores authorized orchestrator keys and their voting power.

```rust
#[account]
pub struct ValidatorRegistry {
    pub validators: Vec<ValidatorInfo>,
    pub total_voting_power: u64,
    pub bump: u8,
}

pub struct ValidatorInfo {
    pub orchestrator_pubkey: Pubkey,  // Solana pubkey of orchestrator
    pub mirage_validator: String,     // miragevaloper1... address
    pub voting_power: u64,            // Stake weight
}
```

### MintRecord

Tracks attestations for a specific Mirage burn transaction.

```rust
#[account]
pub struct MintRecord {
    pub burn_tx_hash: [u8; 32],       // Mirage tx hash (unique key)
    pub recipient: Pubkey,            // Solana recipient
    pub amount: u64,                  // Amount to mint
    pub attestations: Vec<Pubkey>,    // Orchestrators that have attested
    pub attested_power: u64,          // Sum of attesting validator power
    pub completed: bool,              // True once minted
    pub completed_at: Option<i64>,    // Timestamp when minted
    pub bump: u8,
}
```

### BurnRecord

Records a burn on Solana for orchestrators to observe.

```rust
#[account]
pub struct BurnRecord {
    pub burn_id: u64,                 // Auto-incrementing nonce
    pub solana_sender: Pubkey,        // Who burned
    pub mirage_recipient: String,     // Destination on Mirage chain
    pub amount: u64,                  // Amount burned
    pub timestamp: i64,               // Unix timestamp
    pub bump: u8,
}
```

---

## Instructions

### 1. initialize

One-time setup to create the MIRAGE mint and configure the bridge.

**Parameters:**
```rust
pub struct InitializeParams {
    pub mirage_chain_id: String,      // Must be "mirage-1"
    pub attestation_threshold: u64,   // 6667 for 66.67%
}
```

**Logic:**
1. Create MIRAGE mint with 6 decimals, authority = `bridge_config` PDA
2. Initialize `bridge_config` with provided params
3. Initialize empty `validator_registry`

---

### 2. burn

User burns MIRAGE on Solana to receive native MIRAGE on Mirage chain.

**Parameters:**
```rust
pub struct BurnParams {
    pub mirage_recipient: String,     // bech32 address: mirage1...
    pub amount: u64,                  // Amount to burn (6 decimals)
}
```

**Logic:**
1. Check bridge is not paused
2. Validate amount > 0
3. Validate `mirage_recipient` is valid bech32 with "mirage" HRP
4. Burn tokens via CPI to SPL Token program
5. Increment `burn_nonce`
6. Update `total_burned`
7. Create `burn_record`
8. **Emit `BurnInitiated` event** (critical for orchestrators)

---

### 3. mint

Orchestrators call this to attest to a Mirage burn. When threshold is reached, tokens are minted.

**Parameters:**
```rust
pub struct MintParams {
    pub burn_tx_hash: [u8; 32],       // Mirage tx hash where burn occurred
    pub mirage_sender: String,        // Who burned on Mirage
    pub amount: u64,                  // Amount to mint
}
```

**Logic:**
1. Check bridge is not paused
2. Validate amount > 0
3. **Verify Ed25519 signature** via instructions sysvar
4. Verify orchestrator is in validator registry
5. If mint_record exists: verify parameters match
6. If new: initialize mint_record
7. Check orchestrator hasn't already attested
8. Add orchestrator to attestations, add voting power
9. **Emit `MintAttested` event**
10. If threshold reached (≥66.67%):
    - Mint tokens to recipient
    - Mark completed
    - **Emit `MintCompleted` event**

---

### 4. update_validators

Authority updates the validator set.

**Parameters:**
```rust
pub struct UpdateValidatorsParams {
    pub validators: Vec<ValidatorInfo>,
}
```

**Logic:**
1. Verify caller is authority
2. Validate validators is not empty
3. Replace validator registry
4. Recalculate total voting power

---

### 5. pause / unpause

Emergency controls for the bridge.

**Logic:**
1. Verify caller is authority
2. Set `paused` flag accordingly
3. Emit `BridgePaused` or `BridgeUnpaused` event

---

## Events

### BurnInitiated

Emitted when user burns MIRAGE on Solana. **Critical for orchestrators.**

```rust
#[event]
pub struct BurnInitiated {
    pub burn_id: u64,              // Unique nonce
    pub solana_sender: Pubkey,     // Who burned
    pub mirage_recipient: String,  // Where to mint on Mirage
    pub amount: u64,               // Amount (6 decimals)
    pub timestamp: i64,            // Unix timestamp
}
```

**Discriminator:** `sha256("event:BurnInitiated")[0..8]`

### MintAttested

Emitted when an orchestrator attests to a mint.

```rust
#[event]
pub struct MintAttested {
    pub burn_tx_hash: [u8; 32],
    pub orchestrator: Pubkey,
    pub current_power: u64,        // Attested power so far
    pub threshold: u64,            // Required power
}
```

### MintCompleted

Emitted when threshold is reached and tokens are minted.

```rust
#[event]
pub struct MintCompleted {
    pub burn_tx_hash: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

---

## Security Model

### Ed25519 Signature Verification

Each orchestrator must sign an attestation payload. The bridge uses Solana's **native Ed25519 program** for verification (more efficient than ed25519-dalek crate).

**Attestation Payload Format:**
```rust
fn build_attestation_payload(
    burn_tx_hash: &[u8; 32],
    mirage_sender: &str,
    amount: u64,
    recipient: &Pubkey,  // CRITICAL: prevents redirection attacks
) -> Vec<u8> {
    let mut payload = Vec::new();
    payload.extend_from_slice(burn_tx_hash);           // 32 bytes
    payload.extend_from_slice(&(mirage_sender.len() as u32).to_le_bytes()); // 4 bytes
    payload.extend_from_slice(mirage_sender.as_bytes()); // variable
    payload.extend_from_slice(&amount.to_le_bytes());  // 8 bytes
    payload.extend_from_slice(&recipient.to_bytes());  // 32 bytes
    payload
}
```

**Why include recipient?** Without recipient binding, a malicious actor could intercept a valid attestation and redirect minted tokens to their own address.

### Transaction Structure for Mint

Orchestrators must submit a transaction with TWO instructions:

```
Transaction {
  instructions: [
    // 1. Ed25519 verification (native program)
    Ed25519Program.createInstructionWithPublicKey({
      publicKey: orchestrator.publicKey,
      message: attestationPayload,
      signature: orchestratorSignature,
    }),
    
    // 2. Bridge mint instruction
    program.methods.mint({...}).instruction(),
  ]
}
```

The mint instruction reads the previous instruction via the Instructions Sysvar to verify:
- The Ed25519 instruction exists
- The public key matches the orchestrator
- The message matches the expected attestation payload

---

## Orchestrator Integration

### Watching Burns (Solana → Mirage)

1. Poll `getSignaturesForAddress` on the bridge program
2. Fetch each transaction and parse logs for `Program data:` lines
3. Decode base64 data, check discriminator, parse `BurnInitiated` event
4. Submit `MsgBridgeAttest` to Mirage chain

### Executing Mints (Mirage → Solana)

1. Watch Mirage for `bridge_burn` events
2. Construct attestation payload and sign with Ed25519
3. Build transaction with Ed25519 + mint instructions
4. Submit to Solana

---

## Security Checklist

| Requirement | Status | Test |
|-------------|--------|------|
| `BurnInitiated` event includes all required fields | ✅ | `should emit BurnInitiated event with all required fields` |
| `burn_id` is unique (auto-incrementing nonce) | ✅ | `should auto-increment burn_id for each burn` |
| `mirage_recipient` validated as proper bech32 | ✅ | `should fail with invalid mirage recipient address` |
| `mint` verifies Ed25519 signature with recipient binding | ✅ | `should complete mint with valid Ed25519 attestation` |
| `mint` checks orchestrator is in ValidatorRegistry | ✅ | `should fail mint with unauthorized orchestrator` |
| `mint_record` PDA prevents double-minting | ✅ | `should not mint again after completion` |
| Threshold requires ≥66.67% of validator stake | ✅ | `should accumulate attestations from multiple validators` |
| Emergency pause flag can halt burn operations | ✅ | `should fail when bridge is paused` (burn) |
| Emergency pause flag can halt mint operations | ✅ | `should fail mint when bridge is paused` |
| Double attestation is idempotent | ✅ | `should prevent double attestation from same validator` |

---

## Testing Checklist

### Initialize
- [x] Creates bridge config, validator registry, and mint
- [x] Stores correct configuration values
- [x] Registry starts empty

### Update Validators
- [x] Updates validator set successfully
- [x] Calculates total voting power correctly
- [x] Fails with unauthorized caller
- [x] Fails with empty validator set

### Pause/Unpause
- [x] Pause sets `paused = true`
- [x] Unpause sets `paused = false`
- [x] Only authority can pause/unpause

### Burn
- [x] Burns tokens successfully
- [x] Updates `burn_nonce` and `total_burned`
- [x] Creates burn record with correct fields
- [x] Emits `BurnInitiated` event
- [x] `burn_id` auto-increments (uniqueness)
- [x] Fails with invalid bech32 address
- [x] Fails with zero amount
- [x] Fails when bridge is paused

### Mint
- [x] Fails with unauthorized orchestrator
- [x] Fails with zero amount
- [x] Completes mint when threshold reached (single validator 100%)
- [x] Accumulates attestations from multiple validators
- [x] Mints only when threshold (66.67%) reached
- [x] Prevents double attestation (idempotent)
- [x] Fails when bridge is paused
- [x] Double-mint prevented by design

---

## Deployment

1. Build: `anchor build`
2. Deploy to devnet: `anchor deploy --provider.cluster devnet`
3. Initialize bridge with test validator set
4. Test full round-trip with orchestrator
5. Deploy to mainnet after thorough testing
6. Initialize with real Mirage validator set

---

## Contact

For questions about the Mirage side of the bridge, orchestrator interface, or validator set management, contact the Mirage core team.

**Mirage Chain Resources:**
- Chain ID: `mirage-1`
- Token denom: `umirage` (1 MIRAGE = 1,000,000 umirage)
