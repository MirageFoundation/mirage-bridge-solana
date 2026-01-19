# Mirage Bridge Scripts

Scripts for interacting with the Mirage Bridge Solana program on localnet, devnet, or mainnet.

## Quick Start (Localnet E2E Test)

```bash
# Note: Test wallets are already committed in scripts/wallets/ for convenience.
# Skip step 3 if they already exist.
# 1. Install solforge (if not already)
curl -fsSl https://install.solforge.sh | sh

# 2. Start local validator (builds & deploys automatically)
solforge

# In another terminal:

# 3. Generate test wallets (skip if scripts/wallets/*.json already exist)
bun run bridge:generate-wallets

# 4. Setup everything (init, register validators, fund wallets)
bun run bridge:setup

# 5. Run E2E test (mint + burn)
bun run bridge:e2e
```

---

## Prerequisites

1. **Install solforge** (local Solana development):
   ```bash
   curl -fsSl https://install.solforge.sh | sh
   ```

2. **Start local validator** (auto-builds and deploys):
   ```bash
   solforge
   ```

3. **Deploy to devnet** (if needed):
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NETWORK` | Network to use: `localnet`, `devnet`, `mainnet` | `localnet` |
| `WALLET` | Path to wallet keypair JSON | `./test-wallet.json` |
| `RPC_URL` | Override RPC URL | Network default |

## Scripts Overview

### Testing Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `generate-wallets` | `bun run bridge:generate-wallets` | Generate validator & test user wallets |
| `setup-localnet` | `bun run bridge:setup` | Full setup (init + validators + fund) |
| `test-e2e` | `bun run bridge:e2e` | Run E2E test (mint + burn) |
| `fund-wallets` | `bun run bridge:fund` | Fund test wallets with SOL |

### Bridge Operations

| Script | Command | Who Can Run |
|--------|---------|-------------|
| `initialize` | `bun run bridge:init` | Anyone (once) |
| `update-validators` | `bun run bridge:validators` | Authority only |
| `burn` | `bun run bridge:burn` | Any token holder |
| `mint` | `bun run bridge:mint` | Registered orchestrators |
| `pause` | `bun run bridge:pause` | Authority only |
| `unpause` | `bun run bridge:unpause` | Authority only |

### Query Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `status` | `bun run bridge:status` | View bridge config & validators |
| `get-burn-record` | `bun run bridge:get-burn` | View a burn record by ID |
| `get-mint-record` | `bun run bridge:get-mint` | View mint attestation status |

---

## Testing Workflow

### 1. Generate Test Wallets

Creates validator keypairs and a test user wallet in `scripts/wallets/`.

> **Note:** Test wallets are already committed to the repo for convenience.
> You only need to regenerate if you want fresh keys or a different number of validators.

```bash
bun run bridge:generate-wallets

# Custom number of validators
NUM_VALIDATORS=5 bun run bridge:generate-wallets
```

**Output:**
- `scripts/wallets/validator1.json` ... `validatorN.json`
- `scripts/wallets/test-user.json`
- `scripts/wallets/validators.json` (config for update-validators)

### 2. Setup

One-command setup that:
- Initializes bridge (if not already)
- Registers generated validators
- Funds all wallets with SOL

```bash
bun run bridge:setup
```

### 3. Run E2E Test

Full end-to-end test:
1. **Mint Test**: Validators attest to a simulated Mirage burn → tokens minted to test user
2. **Burn Test**: Test user burns tokens → BurnRecord created

```bash
bun run bridge:e2e
```

Example output:
```
═══════════════════════════════════════════════════════════════
              MIRAGE BRIDGE END-TO-END TEST
═══════════════════════════════════════════════════════════════

✓ Bridge initialized
✓ Loaded 3 validator wallets
✓ 3 validators registered
  Required power for threshold: 6667 (66.67%)
  Validators needed: 2

───────────────────────────────────────────────────────────────
TEST 1: MINT (Mirage → Solana)
───────────────────────────────────────────────────────────────

  Validator 1: FvK9bLyZ...
    Power: +3333 → 3333 (33.3%)
    Completed: false

  Validator 2: 8hN7rteJ...
    Power: +3333 → 6666 (66.6%)
    Completed: true

  🎉 Threshold reached! Tokens minted.

✓ Test user balance: 100 MIRAGE

───────────────────────────────────────────────────────────────
TEST 2: BURN (Solana → Mirage)
───────────────────────────────────────────────────────────────

✓ Burn successful!
  Burn ID: 0
  Amount: 50 MIRAGE

═══════════════════════════════════════════════════════════════
                    TEST SUMMARY
═══════════════════════════════════════════════════════════════

Total Minted: 100 MIRAGE
Total Burned: 50 MIRAGE
✅ E2E test complete!
```

---

## Devnet Testing

All scripts work on devnet - just set `NETWORK=devnet`:

> **Note:** The committed test wallets in `scripts/wallets/` can be reused on devnet.
> Just make sure to fund them first.

```bash
export NETWORK=devnet

# Deploy to devnet first
anchor build
anchor deploy --provider.cluster devnet

# Generate wallets, setup, and test
bun run bridge:generate-wallets
bun run bridge:setup    # Transfers SOL from authority on devnet
bun run bridge:e2e
```

---

## Individual Scripts

### Initialize Bridge

**Run by:** Anyone (one-time setup)

```bash
bun run bridge:init

# With custom parameters
CHAIN_ID=mirage-1 THRESHOLD=6667 bun run bridge:init
```

### Update Validators

**Run by:** Authority only

```bash
# Using generated wallets
VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators

# Using custom JSON file
VALIDATORS_FILE=my-validators.json bun run bridge:validators
```

**Validator JSON format:**
```json
[
  {
    "orchestratorPubkey": "SolanaPublicKeyBase58",
    "mirageValidator": "miragevaloper1...",
    "votingPower": 5000
  }
]
```

### Burn MIRAGE

**Run by:** Any token holder

```bash
RECIPIENT=mirage1abc123... AMOUNT=100 bun run bridge:burn
```

### Mint MIRAGE (Orchestrator)

**Run by:** Registered orchestrators only

```bash
# Use a validator wallet
WALLET=scripts/wallets/validator1.json \
BURN_TX_HASH=abc123...def456 \
MIRAGE_SENDER=mirage1sender... \
RECIPIENT=SolanaRecipientPubkey \
AMOUNT=100 \
bun run bridge:mint
```

### Pause / Unpause

```bash
bun run bridge:pause
bun run bridge:unpause
```

### Query Status

```bash
bun run bridge:status

BURN_ID=0 bun run bridge:get-burn
BURN_TX_HASH=abc123... bun run bridge:get-mint
```

---

## Manual Multi-Validator Mint Flow

To manually test the attestation threshold with multiple validators:

```bash
# Generate a burn tx hash (32 bytes hex)
BURN_HASH=$(openssl rand -hex 32)
echo "Burn TX Hash: $BURN_HASH"

# Validator 1 attests (won't complete - below threshold)
WALLET=scripts/wallets/validator1.json \
BURN_TX_HASH=$BURN_HASH \
MIRAGE_SENDER=mirage1testuser123 \
RECIPIENT=<recipient-pubkey> \
AMOUNT=100 \
bun run bridge:mint

# Check progress
BURN_TX_HASH=$BURN_HASH bun run bridge:get-mint

# Validator 2 attests (should complete if threshold reached)
WALLET=scripts/wallets/validator2.json \
BURN_TX_HASH=$BURN_HASH \
MIRAGE_SENDER=mirage1testuser123 \
RECIPIENT=<recipient-pubkey> \
AMOUNT=100 \
bun run bridge:mint

# Verify completion
BURN_TX_HASH=$BURN_HASH bun run bridge:get-mint
```

---

## Troubleshooting

### "Validators not generated"
Run `bun run bridge:generate-wallets` first.

### "No validators registered"
Run `bun run bridge:setup` or manually:
```bash
VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators
```

### "Wallet is not a registered orchestrator"
The wallet trying to mint is not in the validator registry. Either:
- Use a wallet from `scripts/wallets/validator*.json`
- Register the wallet using update-validators

### "insufficient funds"
Fund wallets with:
```bash
bun run bridge:fund
```

### "Bridge is paused"
```bash
bun run bridge:unpause
```

---

## PDAs Reference

| PDA | Seeds | Description |
|-----|-------|-------------|
| Bridge Config | `["bridge_config"]` | Global config |
| Validator Registry | `["validator_registry"]` | Validator set |
| Token Mint | `["mint"]` | MIRAGE SPL mint |
| Burn Record | `["burn_record", nonce_le_bytes]` | Per-burn record |
| Mint Record | `["mint_record", burn_tx_hash]` | Per-mint attestation |

---

## Wallet Files

| File | Purpose |
|------|---------|
| `test-wallet.json` | Bridge authority (project root) |
| `scripts/wallets/validator1.json` | Orchestrator 1 |
| `scripts/wallets/validator2.json` | Orchestrator 2 |
| `scripts/wallets/validator3.json` | Orchestrator 3 |
| `scripts/wallets/test-user.json` | Test user for burn testing |
| `scripts/wallets/validators.json` | Validator config (auto-generated) |
