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

---

## Prerequisites

```bash
docker --version   # Docker required
```

---

## Quick Start (Devnet)

All commands run inside Docker. Keypairs persist on host at `~/.config/solana/`.

**Before starting:** Create validator config files in `scripts/validators/` (see [Validator Registry](#validator-registry)).

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

# 6. Register validators (~0.01 SOL) - reads scripts/validators/*.json
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
│  1. Run setup_orchestrator.py             2. Copy config files to        │
│     → Detects validator address              scripts/validators/         │
│     → Queries stake from chain                                           │
│     → Creates Solana keypair              3. Run bridge:validators       │
│     → Saves config to ~/.orchestrator/       → Reads all *.json files    │
│                                              → Registers on-chain        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### scripts/validators/ Directory

Put your validator config files here. The script reads **all .json files** in this directory.

**Format:** Each file is a JSON object:

```json
{
  "orchestratorPubkey": "5cDWcHN47rbfeBiMwb7imF2BvJPT2pGvThNqPi6aBsj2",
  "mirageValidator": "miragevaloper1xv63rjc9dymz8pemecupute90469x9aax8gynw",
  "stake": 19995002499187000
}
```

**Fields:**
- `orchestratorPubkey`: Solana pubkey (base58) - the orchestrator's signing key
- `mirageValidator`: The validator's Mirage operator address (miragevaloper1...)
- `stake`: The validator's staked tokens in umirage (integer, no decimals)

**Threshold:** 2/3 of total stake required for mints.

### Setting Up Validators

**Step 1: On each Mirage validator node, run the setup script:**

```bash
python3 deploy/setup_orchestrator.py
```

The script automatically:
1. Detects your validator address from the local keyring
2. Queries your validator's stake from the chain
3. Generates (or imports) a Solana keypair
4. Saves the config to `~/.orchestrator/<valoper>.json`

**Output:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SETUP COMPLETE                                                   │
└──────────────────────────────────────────────────────────────────┘

  Config saved: /home/user/.orchestrator/miragevaloper1xyz....json

  This wallet is EXCLUSIVE to this orchestrator node.
  Maintain at least 0.1 SOL for transaction fees.

{
  "orchestratorPubkey": "5cDWcHN47rbfeBiMwb7imF2BvJPT2pGvThNqPi6aBsj2",
  "mirageValidator": "miragevaloper1xv63rjc9dymz8pemecupute90469x9aax8gynw",
  "stake": 19995002499187000
}
```

**Step 2: Collect configs and copy to bridge repo:**

```bash
# From each validator, copy the generated config
scp validator1:~/.orchestrator/*.json scripts/validators/
scp validator2:~/.orchestrator/*.json scripts/validators/
# etc.
```

**Step 3: Register on Solana:**

```bash
bun run bridge:validators
```

---

## Deploy to Devnet

### Prerequisites

Before deploying, **set up your validators** (see [Validator Registry](#validator-registry) section):
1. Run `setup_orchestrator.py` on each validator node (generates config automatically)
2. Copy the generated configs from `~/.orchestrator/*.json` to `scripts/validators/`

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
Program Id: <your-program-id>
Idl account: <derived-from-program-id>
```

The **IDL (Interface Definition Language)** is like an ABI in Ethereum - it describes how to interact with the program. Anchor stores it on-chain so clients can discover the program's interface without needing the IDL file locally. The IDL account is a PDA derived from your program ID.

---

## Deploy to Mainnet

**Requires ~3 SOL** in authority wallet before starting.

### Step 1: Collect Validator Configs

On each validator node, run:

```bash
python3 deploy/setup_orchestrator.py
```

This generates `~/.orchestrator/<valoper>.json`. Copy all configs to the bridge repo:

```bash
scp validator1:~/.orchestrator/*.json scripts/validators/
scp validator2:~/.orchestrator/*.json scripts/validators/
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
ORCHESTRATOR_SOLANA_PROGRAM_ID=<program-id>
ORCHESTRATOR_SOLANA_TOKEN_ADDRESS=<token-mint-pda>
ORCHESTRATOR_SOLANA_RPC=https://api.devnet.solana.com
ORCHESTRATOR_SOLANA_WS=wss://api.devnet.solana.com
ORCHESTRATOR_SOLANA_KEYPAIR=${HOME}/.mirage/orchestrator/solana-keypair.json
ORCHESTRATOR_SOLANA_CONFIRMATIONS=32
```

### Generate Orchestrator Keypair

```bash
python3 deploy/setup_orchestrator.py
```

This script:
- Detects your validator address and stake from the chain
- Generates a Solana keypair at `~/.mirage/orchestrator/solana-keypair.json`
- Saves the config to `~/.orchestrator/<valoper>.json`
- Waits for funding (~0.1 SOL minimum)

### Register on Solana

Copy the generated config to the bridge repo's `scripts/validators/` and run `bun run bridge:validators`.

---

## Architecture

### PDAs

| PDA | Seeds | Description |
|-----|-------|-------------|
| Bridge Config | `["bridge_config"]` | Global settings |
| Bridge State | `["bridge_state"]` | Replay protection |
| Validator Registry | `["validator_registry"]` | Validators + stake |
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
