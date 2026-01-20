#!/bin/bash
set -e

AUTHORITY_KEYPAIR="/root/.config/solana/mirage-bridge-authority.json"

# Auto-generate authority keypair if not present
if [ ! -f "$AUTHORITY_KEYPAIR" ]; then
    echo "==> No authority keypair found, generating..."
    mkdir -p /root/.config/solana
    solana-keygen new --no-bip39-passphrase -o "$AUTHORITY_KEYPAIR"
    echo ""
    echo "=========================================="
    echo "NEW AUTHORITY KEYPAIR GENERATED"
    echo "Address: $(solana-keygen pubkey $AUTHORITY_KEYPAIR)"
    echo ""
    echo "Fund it at: https://faucet.solana.com/"
    echo "=========================================="
    echo ""
fi

# Set as default keypair for solana CLI
solana config set --keypair "$AUTHORITY_KEYPAIR" >/dev/null 2>&1

# Show wallet info on startup
RPC_URL=$(solana config get | grep 'RPC URL' | awk '{print $3}')
if [[ "$RPC_URL" == *"devnet"* ]]; then
    NETWORK="DEVNET"
elif [[ "$RPC_URL" == *"mainnet"* ]]; then
    NETWORK="MAINNET"
else
    NETWORK="$RPC_URL"
fi
echo "==========================================="
echo "Network: $NETWORK"
echo "Wallet:  $(solana address)"
BALANCE=$(solana balance 2>/dev/null || echo "0 SOL (offline or unfunded)")
echo "Balance: $BALANCE"
echo "==========================================="

exec "$@"
