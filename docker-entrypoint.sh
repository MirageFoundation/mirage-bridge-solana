#!/bin/bash
set -e

WALLET_PATH="/root/.config/solana/id.json"

# Auto-generate wallet if not present
if [ ! -f "$WALLET_PATH" ]; then
    echo "==> No wallet found, generating new keypair..."
    mkdir -p /root/.config/solana
    solana-keygen new --no-bip39-passphrase -o "$WALLET_PATH"
    echo ""
    echo "=========================================="
    echo "NEW WALLET GENERATED"
    echo "Address: $(solana address)"
    echo ""
    echo "Fund it at: https://faucet.solana.com/"
    echo "=========================================="
    echo ""
fi

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
