# Mirage Bridge - Solana Program

Bridges MIRAGE tokens between Mirage and Solana using validator attestation.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

## Setup

```bash
# Start container (auto-generates authority keypair on first run)
./docker.sh start devnet

# Generate program keypair (once)
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# Fund authority (devnet)
solana airdrop 2 && solana airdrop 2
```

Two keypairs in `~/.config/solana/` (mounted from host):
- `mirage-bridge-authority.json` - Pays for deployment, upgrade authority, bridge admin
- `mirage-bridge-program.json` - Program keypair (determines program address)

## Build & Deploy

```bash
./build.sh
anchor deploy
bun run scripts/initialize.ts
```

`build.sh` reads the program ID from `mirage-bridge-program.json` and updates lib.rs, Anchor.toml, and config.ts.

## Scripts

```bash
bun run scripts/status.ts           # Check bridge status
bun run scripts/mint.ts             # Mint tokens (requires env vars)
bun run scripts/burn.ts             # Burn tokens
bun run scripts/update-validators.ts
bun run scripts/pause.ts
bun run scripts/unpause.ts
```

## Test

```bash
bun install
bun test
```

## Docker Commands

```bash
./docker.sh start devnet   # Start and enter container
./docker.sh start mainnet  # Start with mainnet RPC
./docker.sh stop           # Stop container
./docker.sh rebuild        # Rebuild image from scratch
```

## Architecture

**Token**: MIRAGE, 6 decimals, mint authority is Bridge Config PDA

**PDAs**:
- `bridge_config` - Global config
- `bridge_state` - Replay protection bitmap
- `validator_registry` - Authorized validators
- `mint` - MIRAGE SPL token mint
- `mint_record` - Tracks attestations per burn
- `burn_record` - Records each Solana burn

**Instructions**:
- `initialize` - One-time setup
- `burn` - User burns MIRAGE for native on Mirage
- `mint` - Orchestrators attest; mints at 66.67% threshold
- `update_validators` - Update validator set
- `pause` / `unpause` - Emergency controls

## Flow

```
Solana → Mirage: User burns on Solana → Orchestrators attest on Mirage → Mirage mints

Mirage → Solana: User burns on Mirage → Orchestrators call mint() with Ed25519 sigs → Threshold → Solana mints
```

## Files

| File | Description |
|------|-------------|
| `~/.config/solana/mirage-bridge-authority.json` | Authority keypair (deploy, admin) |
| `~/.config/solana/mirage-bridge-program.json` | Program keypair (program address) |
| `target/deploy/mirage_bridge.so` | Compiled program |
| `target/idl/mirage_bridge.json` | IDL for clients |

## License

MIT
