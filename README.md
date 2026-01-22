# Mirage Bridge - Solana Program

Bridges MIRAGE tokens between Mirage blockchain and Solana using validator attestation.

## Overview

Both directions require **2/3 validator stake** to confirm a transfer.

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

**Before starting:** Put validator keypairs in `scripts/validators/` (see [Validator Registry](#validator-registry)).

```bash
# 1. Start Docker container
./docker.sh start devnet

# All remaining commands are inside the container:

# 2. Generate keypairs (first time only)
solana-keygen new -o ~/.config/solana/mirage-bridge-authority.json
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# 3. Fund authority (devnet - free airdrop)
solana airdrop 5

# 4. Build & deploy (~2.5 SOL for program deployment)
./build.sh
anchor deploy

# 5. Initialize bridge (~0.05 SOL for account creation)
bun run bridge:init

# 6. Register validators (~0.01 SOL) - reads scripts/wallets/validator*.json
bun run bridge:validators

# 7. Verify
bun run bridge:status
```

### SOL Cost Summary

| Step | Devnet | Mainnet |
|------|--------|---------|
| Program deployment | ~2.5 SOL | ~2.5 SOL |
| Initialize bridge | ~0.05 SOL | ~0.05 SOL |
| Register validators | ~0.01 SOL | ~0.01 SOL |
| **Total (initial)** | **~2.6 SOL** | **~2.6 SOL** |
| Upgrade (later) | ~0.01 SOL | ~0.01 SOL |

Devnet SOL is free via `solana airdrop`. Mainnet requires real SOL.

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

## Validator Registry

The Solana bridge needs to know which Solana pubkeys are authorized to submit mint attestations. This is the **validator registry**.

### How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         VALIDATOR SETUP                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Mirage Validator Node                    Solana Bridge Program          │
│  ─────────────────────                    ─────────────────────          │
│                                                                          │
│  1. Run setup_orchestrator.py             2. Copy keypair to             │
│     → Creates Solana keypair                 scripts/validators/         │
│     → Outputs pubkey                         (any filename.json)         │
│     → Waits for funding                                                  │
│                                           3. Run bridge:validators       │
│                                              → Reads all *.json files    │
│                                              → Derives pubkeys           │
│                                              → Splits stake equally      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### scripts/validators/ Directory

Put your validator config files here. The script reads **all .json files** in this directory.

```
scripts/validators/
├── node1.json      # Any filename works
├── node2.json
├── alice.json
└── bob.json
```

**Format:** Each file is a JSON object:

```json
{
  "orchestratorPubkey": "7xKp2abc...",
  "mirageValidator": "miragevaloper1xyz...",
  "stake": 1000000
}
```

**Fields:**
- `orchestratorPubkey`: Solana pubkey (base58) from the validator's orchestrator keypair
- `mirageValidator`: The validator's Mirage operator address
- `stake`: The validator's stake amount (absolute number, not percentage)

**Threshold:** 2/3 of total stake required for mints. Total stake = sum of all validator stakes.

### Setting Up Validators

**On each Mirage validator node:**

```bash
# In mirage-node repo
python3 deploy/setup_orchestrator.py

# Output:
# ==================================================
# SOLANA WALLET READY
# ==================================================
#
#   Address: 7xKp2abcdefghijklmnopqrstuvwxyz123456789
#   Keypair: /home/user/.mirage/orchestrator/solana-keypair.json
#
# ==================================================
```

**Collect keypairs:**

Copy each validator's keypair to the bridge repo:

```bash
# From each validator node, copy the keypair file
scp validator1:~/.mirage/orchestrator/solana-keypair.json scripts/validators/node1.json
scp validator2:~/.mirage/orchestrator/solana-keypair.json scripts/validators/node2.json
scp validator3:~/.mirage/orchestrator/solana-keypair.json scripts/validators/node3.json
# etc. (any filename works)
```

**Register on Solana:**

```bash
bun run bridge:validators
# Reads scripts/validators/*.json, derives pubkeys, registers all
```

---

## Deploy to Devnet

### Prerequisites

Before deploying, **set up your validators** (see [Validator Registry](#validator-registry) section):
1. Run `setup_orchestrator.py` on each validator node
2. Copy keypairs to `scripts/validators/` (any .json filename)

### Deploy Steps

```bash
# Start container
./docker.sh start devnet

# Inside container:

# Generate keypairs (skip if already exist)
solana-keygen new -o ~/.config/solana/mirage-bridge-authority.json
solana-keygen new -o ~/.config/solana/mirage-bridge-program.json

# Fund authority (free on devnet, need ~3 SOL total)
solana airdrop 5

# Build (updates program ID in all files)
./build.sh

# Deploy program (~2.5 SOL)
anchor deploy

# Initialize bridge (~0.05 SOL - creates config, state, registry, mint accounts)
bun run bridge:init

# Register validators (~0.01 SOL) - reads scripts/validators/*.json
bun run bridge:validators

# Verify
bun run bridge:status
```

### What Gets Deployed

When you run `anchor deploy`, two things are created:

1. **Program account** - The actual executable code (your program ID)
2. **IDL account** - Stores the program's interface definition (instructions, accounts, types)

```
Program Id: 9rMS8JEHCM5UTGjwKoXV7V32tzkgM9b16LZcbVdPAMdp    ← Your program
Idl account: EcUihngJEvngH1Ruh2o1rvrnGZZks7NCycw7ZrmCFw28   ← Metadata for clients
```

The **IDL (Interface Definition Language)** is like an ABI in Ethereum - it describes how to interact with the program. Anchor stores it on-chain so clients can discover the program's interface without needing the IDL file locally. The IDL account is a PDA derived from your program ID.

---

## Deploy to Mainnet

**Requires ~3 SOL** in authority wallet before starting.

### Step 1: Collect Validator Keypairs

On each validator node:

```bash
python3 deploy/setup_orchestrator.py
# Creates ~/.mirage/orchestrator/solana-keypair.json
```

Copy each keypair to `scripts/validators/`:

```bash
scp validator1:~/.mirage/orchestrator/solana-keypair.json scripts/validators/node1.json
scp validator2:~/.mirage/orchestrator/solana-keypair.json scripts/validators/node2.json
# etc. (any filename works)
```

### Step 2: Deploy

```bash
# Start container
./docker.sh start mainnet

# Inside container:

# Check authority balance (need ~3 SOL)
solana balance
# If insufficient, transfer SOL to this address:
solana-keygen pubkey ~/.config/solana/mirage-bridge-authority.json

# Build & deploy (~2.5 SOL)
./build.sh
anchor deploy

# Initialize (~0.05 SOL)
bun run bridge:init

# Register validators (~0.01 SOL) - reads scripts/validators/*.json
bun run bridge:validators

# Verify
bun run bridge:status
```

### Step 3: Update Mirage Node Config

Update `deploy/templates/env/orchestrator.env` in mirage-node:

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

## Scripts Reference

| Command | Description |
|---------|-------------|
| `bun run bridge:init` | Initialize bridge (one-time) |
| `bun run bridge:validators` | Update validator registry |
| `bun run bridge:status` | View bridge status |
| `bun run bridge:pause` | Pause bridge (emergency) |
| `bun run bridge:unpause` | Unpause bridge |

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
# Outputs the Solana pubkey to share
# Waits for funding (~0.1 SOL minimum)
```

**Fund each orchestrator wallet with ~0.1 SOL** for transaction fees (~0.000005 SOL per mint attestation).

### Register on Solana

Copy the keypair file to `scripts/validators/` in the bridge repo (any .json filename). Then run `bun run bridge:validators`.

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
