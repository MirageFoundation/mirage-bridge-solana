# Mirage Bridge - Solana Program

Bridges MIRAGE tokens between Mirage blockchain and Solana using validator attestation (2/3 threshold).

## Overview

```
Solana → Mirage: User burns on Solana → Orchestrators attest on Mirage → Mirage mints
Mirage → Solana: User burns on Mirage → Orchestrators submit Ed25519 sigs → 2/3 threshold → Solana mints
```

**Program ID (Devnet):** `9rMS8JEHCM5UTGjwKoXV7V32tzkgM9b16LZcbVdPAMdp`  
**Token Mint (Devnet):** `BH8J5cEBvvzHJLehBa2EkN2XHteE7v6rWtEF585JGai2`

---

## Prerequisites

### Option A: Docker (Recommended)

```bash
docker --version
```

### Option B: Native Install

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.0 && avm use 0.32.0
curl -fsSL https://bun.sh/install | bash
```

---

## First-Time Setup

### 1. Generate Keypairs

```bash
# Authority keypair - pays for deployment, owns upgrade authority, bridge admin
solana-keygen new -o ~/.config/solana/mirage-bridge-authority.json

# Program keypair - determines the program address (KEEP THIS FOREVER)
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# View addresses
solana-keygen pubkey ~/.config/solana/mirage-bridge-authority.json
solana-keygen pubkey ~/.config/solana/mirage-bridge-program.json
```

**IMPORTANT:** Back up both keypairs securely. The program keypair determines your program ID forever.

### 2. Fund Authority Wallet

```bash
# Devnet (free)
solana config set --url devnet
solana airdrop 5 ~/.config/solana/mirage-bridge-authority.json

# Mainnet (requires SOL - transfer ~3 SOL to authority address)
solana config set --url mainnet-beta
```

### 3. Install Dependencies

```bash
bun install
```

---

## Build

### Using Docker

```bash
./docker.sh start devnet
# Inside container:
./build.sh
```

### Native

```bash
./build.sh
```

`build.sh` reads the program ID from your keypair and updates `lib.rs`, `Anchor.toml`, and `config.ts`.

---

## Deploy to Devnet

### Step 1: Build & Deploy Program

```bash
# Docker
./docker.sh start devnet
./build.sh
anchor deploy --provider.cluster devnet

# Native
solana config set --url devnet
./build.sh
anchor deploy --provider.cluster devnet
```

### Step 2: Initialize Bridge

```bash
NETWORK=devnet bun run bridge:init
```

### Step 3: Register Validators

```bash
# Using test wallets
NETWORK=devnet VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators

# Or create your own:
cat > my-validators.json << 'EOF'
[
  {"orchestratorPubkey": "SolanaPubkey1...", "mirageValidator": "miragevaloper1...", "votingPower": 3334},
  {"orchestratorPubkey": "SolanaPubkey2...", "mirageValidator": "miragevaloper1...", "votingPower": 3333},
  {"orchestratorPubkey": "SolanaPubkey3...", "mirageValidator": "miragevaloper1...", "votingPower": 3333}
]
EOF
NETWORK=devnet VALIDATORS_FILE=my-validators.json bun run bridge:validators
```

**Note:** Voting power should sum to 10000 (100%). 2/3 threshold = 6667.

### Step 4: Verify

```bash
NETWORK=devnet bun run bridge:status
```

---

## Deploy to Mainnet

### Step 1: Pre-flight

```bash
solana-keygen pubkey ~/.config/solana/mirage-bridge-authority.json
solana balance ~/.config/solana/mirage-bridge-authority.json --url mainnet-beta
# Need ~3 SOL
```

### Step 2: Build & Deploy

```bash
solana config set --url mainnet-beta
./build.sh
anchor deploy --provider.cluster mainnet-beta
```

### Step 3: Initialize & Register Validators

```bash
NETWORK=mainnet bun run bridge:init
NETWORK=mainnet VALIDATORS_FILE=production-validators.json bun run bridge:validators
```

### Step 4: Update Mirage Node Config

In `deploy/templates/env/orchestrator.env`:

```bash
ORCHESTRATOR_SOLANA_PROGRAM_ID=<mainnet-program-id>
ORCHESTRATOR_SOLANA_TOKEN_ADDRESS=<mint-pda>
ORCHESTRATOR_SOLANA_RPC=https://api.mainnet-beta.solana.com
ORCHESTRATOR_SOLANA_WS=wss://api.mainnet-beta.solana.com
```

---

## Upgrade Existing Deployment

```bash
./build.sh
anchor upgrade target/deploy/mirage_bridge.so \
  --program-id <program-id> \
  --provider.cluster devnet
```

State is preserved. Only program code changes.

---

## Testing

### Unit Tests

```bash
bun test
```

### E2E Test (Localnet)

```bash
# Terminal 1
solforge

# Terminal 2
bun run bridge:setup
bun run bridge:e2e
```

### E2E Test (Devnet)

```bash
NETWORK=devnet bun run bridge:setup
NETWORK=devnet bun run bridge:e2e
```

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `bun run bridge:init` | Initialize bridge (one-time) |
| `bun run bridge:setup` | Full setup (init + validators + fund) |
| `bun run bridge:validators` | Update validator registry |
| `bun run bridge:status` | View bridge status |
| `bun run bridge:pause` | Pause bridge (emergency) |
| `bun run bridge:unpause` | Unpause bridge |
| `bun run bridge:burn` | Burn tokens (user action) |
| `bun run bridge:mint` | Submit mint attestation (orchestrator) |
| `bun run bridge:e2e` | Run E2E test |

See `scripts/SCRIPTS.md` for detailed usage.

---

## Integration with Mirage Orchestrator

### Orchestrator Config

In `~/.mirage/env/orchestrator.env`:

```bash
ORCHESTRATOR_ENABLED=true
ORCHESTRATOR_SOLANA_PROGRAM_ID=9rMS8JEHCM5UTGjwKoXV7V32tzkgM9b16LZcbVdPAMdp
ORCHESTRATOR_SOLANA_TOKEN_ADDRESS=BH8J5cEBvvzHJLehBa2EkN2XHteE7v6rWtEF585JGai2
ORCHESTRATOR_SOLANA_RPC=https://api.devnet.solana.com
ORCHESTRATOR_SOLANA_WS=wss://api.devnet.solana.com
ORCHESTRATOR_SOLANA_KEYPAIR=${HOME}/.mirage/orchestrator/solana-keypair.json
ORCHESTRATOR_SOLANA_CONFIRMATIONS=32
```

### Generate Orchestrator Keypair

```bash
python3 deploy/setup_orchestrator.py
# Generates ~/.mirage/orchestrator/solana-keypair.json
# Fund with ~0.1 SOL for tx fees
```

### Register on Solana

```bash
solana-keygen pubkey ~/.mirage/orchestrator/solana-keypair.json
# Add to validators.json and run update-validators
```

---

## Architecture

### PDAs

| PDA | Seeds | Description |
|-----|-------|-------------|
| Bridge Config | `["bridge_config"]` | Global settings |
| Bridge State | `["bridge_state"]` | Replay protection |
| Validator Registry | `["validator_registry"]` | Validators + power |
| Token Mint | `["mint"]` | MIRAGE SPL token |
| Mint Record | `["mint_record", burn_tx_hash]` | Attestation tracking |
| Burn Record | `["burn_record", nonce_le_bytes]` | Burn records |

### Security

- Ed25519 signatures verified on-chain
- 2/3 threshold for mints
- Replay protection via bitmap
- Destination chain binding prevents cross-chain replay

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| Account not found | Run `bun run bridge:init` |
| Not registered orchestrator | Run `bun run bridge:validators` |
| Insufficient funds | Fund authority with SOL |
| Bridge is paused | Run `bun run bridge:unpause` |
| Program keypair not found | `solana-keygen new -o ~/.config/solana/mirage-bridge-program.json` |

---

## Files

| File | Description |
|------|-------------|
| `~/.config/solana/mirage-bridge-authority.json` | Authority keypair |
| `~/.config/solana/mirage-bridge-program.json` | Program keypair |
| `target/deploy/mirage_bridge.so` | Compiled program |
| `target/idl/mirage_bridge.json` | IDL for clients |

---

## License

MIT
