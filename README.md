# Mirage Bridge - Solana Program

Bridges MIRAGE tokens between Mirage blockchain and Solana using validator attestation.

## Overview

Both directions require **2/3 validator voting power** to confirm a transfer.

### Inbound: Solana → Mirage

```
┌──────────┐     ┌──────────┐     ┌─────────────────┐     ┌──────────┐
│  User    │     │  Solana  │     │  Orchestrators  │     │  Mirage  │
│  Wallet  │     │  Program │     │   (validators)  │     │  Chain   │
└────┬─────┘     └────┬─────┘     └───────┬─────────┘     └────┬─────┘
     │                │                   │                    │
     │  1. Burn       │                   │                    │
     │───────────────>│                   │                    │
     │                │                   │                    │
     │                │  2. Detect burn   │                    │
     │                │──────────────────>│                    │
     │                │                   │                    │
     │                │                   │  3. Each validator │
     │                │                   │  submits attestation
     │                │                   │───────────────────>│
     │                │                   │                    │
     │                │                   │         4. Accumulate
     │                │                   │            attestations
     │                │                   │                    │
     │                │                   │         5. 2/3 threshold
     │                │                   │            reached?
     │                │                   │            ─────────
     │                │                   │            YES → Mint
     │                │                   │                    │
     │<───────────────│───────────────────│────────────────────│
     │                     6. MIRAGE arrives in Mirage wallet  │
```

### Outbound: Mirage → Solana

```
┌──────────┐     ┌──────────┐     ┌─────────────────┐     ┌──────────┐
│  User    │     │  Mirage  │     │  Orchestrators  │     │  Solana  │
│  Wallet  │     │  Chain   │     │   (validators)  │     │  Program │
└────┬─────┘     └────┬─────┘     └───────┬─────────┘     └────┬─────┘
     │                │                   │                    │
     │  1. Burn       │                   │                    │
     │───────────────>│                   │                    │
     │                │                   │                    │
     │                │  2. Detect burn   │                    │
     │                │──────────────────>│                    │
     │                │                   │                    │
     │                │                   │  3. Each validator │
     │                │                   │  submits Ed25519 sig
     │                │                   │───────────────────>│
     │                │                   │                    │
     │                │                   │         4. Accumulate
     │                │                   │            signatures
     │                │                   │                    │
     │                │                   │         5. 2/3 threshold
     │                │                   │            reached?
     │                │                   │            ─────────
     │                │                   │            YES → Mint
     │                │                   │                    │
     │<───────────────│───────────────────│────────────────────│
     │                     6. MIRAGE arrives in Solana wallet  │
```

**Program ID (Devnet):** `9rMS8JEHCM5UTGjwKoXV7V32tzkgM9b16LZcbVdPAMdp`  
**Token Mint (Devnet):** `BH8J5cEBvvzHJLehBa2EkN2XHteE7v6rWtEF585JGai2`

---

## Prerequisites

```bash
docker --version   # Docker required
```

---

## Quick Start (Devnet)

All commands run inside Docker. Keypairs persist on host at `~/.config/solana/`.

```bash
# 1. Start Docker container
./docker.sh start devnet

# All remaining commands are inside the container:

# 2. Generate keypairs (first time only)
solana-keygen new -o ~/.config/solana/mirage-bridge-authority.json
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# 3. Fund authority (devnet)
solana airdrop 5

# 4. Build & deploy
./build.sh
anchor deploy

# 5. Initialize bridge
bun run bridge:init

# 6. Register validators
VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators

# 7. Verify
bun run bridge:status
```

---

## Keypairs

Two keypairs stored at `~/.config/solana/` (mounted from host, persists across containers):

| Keypair | Purpose | When Needed |
|---------|---------|-------------|
| `mirage-bridge-authority.json` | Pays for deployment, upgrade authority, bridge admin | **Always** - keep this safe |
| `mirage-bridge-program.json` | Determines program address (public key = program ID) | Only during **initial** deployment |

**About the program keypair:**
- The **public key** becomes your permanent program ID
- The **private key** is only used once during `anchor deploy`
- After initial deployment, upgrades use the **authority keypair**
- **Devnet:** Regenerate anytime for a new program address
- **Mainnet:** Back it up, but not strictly required after deploy

---

## Deploy to Devnet

```bash
# Start container
./docker.sh start devnet

# Inside container:

# Generate keypairs (skip if already exist)
solana-keygen new -o ~/.config/solana/mirage-bridge-authority.json
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# Fund authority
solana airdrop 5

# Build (updates program ID in all files)
./build.sh

# Deploy
anchor deploy

# Initialize bridge
bun run bridge:init

# Register validators (test wallets or your own)
VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators

# Verify
bun run bridge:status
```

---

## Deploy to Mainnet

```bash
# Start container
./docker.sh start mainnet

# Inside container:

# Check authority balance (need ~3 SOL)
solana balance

# Build & deploy
./build.sh
anchor deploy

# Initialize
bun run bridge:init

# Register production validators
VALIDATORS_FILE=production-validators.json bun run bridge:validators

# Verify
bun run bridge:status
```

Then update `deploy/templates/env/orchestrator.env` in mirage-node:

```bash
ORCHESTRATOR_SOLANA_PROGRAM_ID=<mainnet-program-id>
ORCHESTRATOR_SOLANA_TOKEN_ADDRESS=<mint-pda>
ORCHESTRATOR_SOLANA_RPC=https://api.mainnet-beta.solana.com
ORCHESTRATOR_SOLANA_WS=wss://api.mainnet-beta.solana.com
```

---

## Upgrade Existing Deployment

```bash
./docker.sh start devnet   # or mainnet

# Inside container:
./build.sh
anchor upgrade target/deploy/mirage_bridge.so --program-id <program-id>
```

State is preserved. Only program code changes.

---

## Testing

All tests run inside Docker.

### Unit Tests

```bash
./docker.sh start devnet

# Inside container:
bun test
```

### E2E Test (Localnet)

```bash
./docker.sh start devnet

# Inside container:
# Terminal 1 - start local validator
solforge

# Terminal 2 (docker exec into same container)
bun run bridge:setup
bun run bridge:e2e
```

### E2E Test (Devnet)

```bash
./docker.sh start devnet

# Inside container:
bun run bridge:setup
bun run bridge:e2e
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

All commands run inside Docker (`./docker.sh start devnet`).

| Error | Solution |
|-------|----------|
| Account not found | `bun run bridge:init` |
| Not registered orchestrator | `bun run bridge:validators` |
| Insufficient funds | `solana airdrop 5` (devnet) or transfer SOL (mainnet) |
| Bridge is paused | `bun run bridge:unpause` |
| Program keypair not found | `solana-keygen new -o ~/.config/solana/mirage-bridge-program.json` |
| Docker permission denied | `sudo usermod -aG docker $USER` then re-login |

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
