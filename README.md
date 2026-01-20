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

- [Docker](https://docs.docker.com/get-docker/)

All other dependencies (Rust, Solana CLI, Anchor, Bun) are provided by the Docker container.

### Development Environment

```bash
# Start the development container (builds image on first run)
./docker.sh start devnet    # or: ./docker.sh start mainnet

# Stop the container
./docker.sh stop

# Rebuild the Docker image (after Dockerfile changes)
./docker.sh rebuild
```

On first start, if no wallet exists at `~/.config/solana/id.json`, one is generated automatically.
Fund your wallet at https://faucet.solana.com/ (devnet).

### Build

**Always use `./build.sh`** instead of `anchor build` directly:

```bash
./build.sh
```

This script:
1. Runs `anchor keys sync` - syncs `declare_id!` in lib.rs with the program keypair
2. Runs `anchor build`
3. Updates `scripts/common/config.ts` with the program ID

This prevents program ID mismatches that cause failed deployments.

### Test

```bash
bun install
bun test
```

### Deploy

```bash
# Build first (always!)
./build.sh

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (after thorough testing)
anchor deploy --provider.cluster mainnet
```

### Key Files

| File | Description |
|------|-------------|
| `target/deploy/mirage_bridge-keypair.json` | Program keypair (determines program ID) |
| `target/deploy/mirage_bridge.so` | Compiled program binary |
| `target/idl/mirage_bridge.json` | IDL for client integration |
| `~/.config/solana/id.json` | Your wallet (mounted from host) |

## Concepts

### Program ID

Every Solana program has a unique address derived from its keypair (`target/deploy/mirage_bridge-keypair.json`). This ID must be declared in two places:

1. **lib.rs**: `declare_id!("...")` - the program checks this at runtime
2. **config.ts**: `PROGRAM_ID` - clients use this to call the program

If these don't match the deployed program, calls will fail. The `./build.sh` script keeps them in sync automatically.

### IDL (Interface Definition Language)

A JSON file (`target/idl/mirage_bridge.json`) describing the program's API - all instructions, accounts, and types. Think of it like an ABI in Ethereum. Clients use it to know how to serialize/deserialize data when calling the program.

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
