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

**Before starting:** Set up validator orchestrators and create `devnet-validators.json` (see [Validator Registry](#validator-registry)).

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

# 6. Register validators (~0.01 SOL)
VALIDATORS_FILE=scripts/wallets/devnet-validators.json bun run bridge:validators

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
│  1. Run setup_orchestrator.py             3. Register in validator       │
│     → Creates Solana keypair                 registry with:              │
│     → ~/.mirage/orchestrator/                - Solana pubkey             │
│        solana-keypair.json                   - Mirage valoper address    │
│                                              - Voting power              │
│  2. Get pubkey:                                                          │
│     solana-keygen pubkey                  4. Now this orchestrator       │
│       ~/.mirage/orchestrator/                can submit attestations     │
│       solana-keypair.json                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### validators.json Format

```json
[
  {
    "orchestratorPubkey": "7xKp2abc...",      // Solana pubkey (base58)
    "mirageValidator": "miragevaloper1xyz...", // Mirage validator address
    "votingPower": 2500                        // Basis points (2500 = 25%)
  },
  {
    "orchestratorPubkey": "9qRs3def...",
    "mirageValidator": "miragevaloper1abc...",
    "votingPower": 2500
  }
]
```

**Fields:**
- `orchestratorPubkey`: The Solana pubkey from the orchestrator's keypair. This is the key that signs mint transactions on Solana.
- `mirageValidator`: The Mirage validator operator address (miragevaloper1...). Used for logging/tracking.
- `votingPower`: The validator's weight in basis points. **Must sum to 10000** across all validators. 2/3 threshold = 6667 required.

### scripts/wallets/ Directory

| File | Purpose |
|------|---------|
| `validators.json` | Config file mapping orchestrator pubkeys to voting power |
| `validator1.json`, `validator2.json`, ... | Solana keypair files (byte arrays) for **local testing only** |
| `test-user.json` | Test user keypair for E2E tests |

**Important:** The `validator*.json` keypair files are **test wallets for local E2E testing only**. For real deployments (devnet/mainnet), you must:
1. Generate real orchestrator keypairs on each validator node
2. Collect the pubkeys
3. Create a new validators.json with those real pubkeys

### Setting Up Validators (Real Deployment)

**On each Mirage validator node:**

```bash
# In mirage-node repo directory
python3 deploy/setup_orchestrator.py

# Output:
# ==================================================
# SOLANA WALLET READY
# ==================================================
#
#   Address: 7xKp2abcdefghijklmnopqrstuvwxyz123456789   <-- THIS IS THE PUBKEY
#   Keypair: /home/user/.mirage/orchestrator/solana-keypair.json
#
# ==================================================
```

The script:
1. Generates (or imports) a 12-word mnemonic
2. Derives a Solana keypair using BIP44 (Phantom-compatible)
3. Saves to `~/.mirage/orchestrator/solana-keypair.json`
4. **Outputs the pubkey** - share this with the bridge deployer
5. Waits for funding (~0.1 SOL minimum for tx fees)

**Then create validators.json:**

```bash
# In mirage-bridge-solana repo
cat > scripts/wallets/devnet-validators.json << 'EOF'
[
  {
    "orchestratorPubkey": "7xKp2abc...",
    "mirageValidator": "miragevaloper1node1...",
    "votingPower": 2500
  },
  {
    "orchestratorPubkey": "9qRs3def...",
    "mirageValidator": "miragevaloper1node2...",
    "votingPower": 2500
  },
  {
    "orchestratorPubkey": "BmTu4ghi...",
    "mirageValidator": "miragevaloper1node3...",
    "votingPower": 2500
  },
  {
    "orchestratorPubkey": "DnVv5jkl...",
    "mirageValidator": "miragevaloper1node4...",
    "votingPower": 2500
  }
]
EOF
```

**Register on Solana:**

```bash
VALIDATORS_FILE=scripts/wallets/devnet-validators.json bun run bridge:validators
```

---

## Deploy to Devnet

### Prerequisites

Before deploying, **set up your validators** (see [Validator Registry](#validator-registry) section):
1. Run `setup_orchestrator.py` on each validator node
2. Collect the Solana pubkeys
3. Create `scripts/wallets/devnet-validators.json`

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

# Register your validators (~0.01 SOL)
VALIDATORS_FILE=scripts/wallets/devnet-validators.json bun run bridge:validators

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

### Step 1: Collect Validator Orchestrator Keys

Before deploying, each validator must generate their orchestrator Solana keypair:

```bash
# On each validator node (in mirage-node repo):
python3 deploy/setup_orchestrator.py
# The script outputs the pubkey - share it with the bridge deployer
```

Create `scripts/wallets/mainnet-validators.json` with collected pubkeys:

```json
[
  {
    "orchestratorPubkey": "<validator1-solana-pubkey>",
    "mirageValidator": "miragevaloper1...",
    "votingPower": 2500
  },
  {
    "orchestratorPubkey": "<validator2-solana-pubkey>",
    "mirageValidator": "miragevaloper1...",
    "votingPower": 2500
  }
]
```

**Note:** `votingPower` should match the validator's stake on Mirage chain (in basis points, total = 10000).

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

# Register validators (~0.01 SOL)
VALIDATORS_FILE=scripts/wallets/mainnet-validators.json bun run bridge:validators

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

## Testing (E2E)

```bash
./docker.sh start devnet

# Inside container:
bun run bridge:setup   # Initialize + register validators + fund wallets
bun run bridge:e2e     # Run full mint + burn test
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
# Outputs the Solana pubkey to share
# Waits for funding (~0.1 SOL minimum)
```

**Fund each orchestrator wallet with ~0.1 SOL** for transaction fees (~0.000005 SOL per mint attestation).

### Register on Solana

Share the pubkey (shown by setup script) with the bridge deployer. They'll add it to `validators.json` and run `bun run bridge:validators`.

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
