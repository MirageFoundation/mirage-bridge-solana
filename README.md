# Mirage Bridge - Solana Program

A Solana program that bridges MIRAGE tokens between the Mirage blockchain and Solana using a validator-attested model.

## Overview

The bridge enables bidirectional token transfers:

- **Inbound (Solana → Mirage)**: Users burn MIRAGE on Solana → Orchestrators attest on Mirage → Mirage mints native MIRAGE
- **Outbound (Mirage → Solana)**: Users burn on Mirage → Orchestrators call Solana mint → 66.67% threshold → Solana mints wrapped MIRAGE

```
┌─────────────────────────────────────────────────────────────────┐
│  Solana → Mirage                                                │
│  User burns on Solana → BurnInitiated event → Orchestrators     │
│  attest on Mirage → Mirage mints when 66.67% validators agree   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Mirage → Solana                                                │
│  User burns on Mirage → Orchestrators call Solana mint()        │
│  with Ed25519 signatures → Threshold reached → Solana mints     │
└─────────────────────────────────────────────────────────────────┘
```

## Token Details

| Property | Value |
|----------|-------|
| Name | MIRAGE |
| Symbol | MIRAGE |
| Decimals | 6 |
| Mint Authority | Bridge Config PDA |

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.75+)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (0.32+)
- [Bun](https://bun.sh/) (for testing)

### Build

```bash
anchor build
```

### Test

```bash
bun install
bun test
```

### Deploy

```bash
# Devnet
anchor deploy --provider.cluster devnet

# Mainnet (after thorough testing)
anchor deploy --provider.cluster mainnet
```

## Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize` | One-time setup: creates MIRAGE mint, bridge config, validator registry |
| `burn` | User burns MIRAGE to receive native MIRAGE on Mirage chain |
| `mint` | Orchestrators attest to Mirage burns; mints when 66.67% threshold reached |
| `update_validators` | Authority updates the validator set |
| `pause` | Emergency pause of bridge operations |
| `unpause` | Resume bridge operations |

## Architecture

### PDAs

| PDA | Seeds | Description |
|-----|-------|-------------|
| `bridge_config` | `["bridge_config"]` | Global configuration |
| `validator_registry` | `["validator_registry"]` | Authorized validators |
| `mint` | `["mint"]` | MIRAGE SPL token mint |
| `mint_record` | `["mint_record", burn_tx_hash]` | Tracks attestations per Mirage burn |
| `burn_record` | `["burn_record", nonce_bytes]` | Records each Solana burn |

### Security Model

- **Validator Attestation**: 66.67% of Mirage validator stake must attest before minting
- **Ed25519 Signatures**: Each orchestrator signs attestation payloads (verified via native Ed25519 program)
- **Recipient Binding**: Signed payload includes recipient to prevent redirection attacks
- **Double-Mint Prevention**: `mint_record` PDA keyed by `burn_tx_hash` ensures uniqueness
- **Emergency Controls**: Authority can pause/unpause bridge

## Testing

The test suite uses **LiteSVM** for fast, deterministic testing without a local validator.

```bash
# Run all tests
bun test

# Watch mode
bun test --watch
```

### Test Coverage

| Spec | Tests | Description |
|------|-------|-------------|
| `initialize.spec.ts` | 3 | Bridge initialization |
| `update_validators.spec.ts` | 5 | Validator set management |
| `pause.spec.ts` | 3 | Emergency pause |
| `unpause.spec.ts` | 3 | Resume operations |
| `burn.spec.ts` | 8 | Token burning, events, validation |
| `mint.spec.ts` | 8 | Ed25519 attestation, threshold logic |

**Total: 30 tests, 78 assertions**

## Documentation

- [Bridge Specification](docs/BRIDGE_SPEC.md) - Complete technical specification

## Project Structure

```
programs/mirage-bridge/src/
├── lib.rs                  # Program entrypoint
├── constants.rs            # MAX_VALIDATORS, thresholds, etc.
├── errors.rs               # Error codes
├── events.rs               # BurnInitiated, MintCompleted, etc.
├── state/                  # Account structures
│   ├── bridge_config.rs
│   ├── validator_registry.rs
│   ├── mint_record.rs
│   └── burn_record.rs
├── instructions/           # Instruction handlers
│   ├── initialize.rs
│   ├── burn.rs
│   ├── mint.rs
│   ├── update_validators.rs
│   ├── pause.rs
│   └── unpause.rs
└── utils/
    ├── bech32.rs           # Mirage address validation
    └── ed25519.rs          # Native Ed25519 verification

tests/
├── mirage-bridge.spec.ts   # Main test entry
├── specs/                  # Individual test specs
└── utils/                  # Test helpers
```

## License

MIT
