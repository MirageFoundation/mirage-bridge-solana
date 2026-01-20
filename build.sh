#!/bin/bash
# Build script that ensures program ID is always in sync
# Usage: ./build.sh

set -e

PROGRAM_KEYPAIR="$HOME/.config/solana/mirage-bridge-program.json"

if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo "ERROR: Program keypair not found at $PROGRAM_KEYPAIR"
    echo ""
    echo "Generate one with:"
    echo "  solana-keygen new -o ~/.config/solana/mirage-bridge-program.json"
    echo ""
    exit 1
fi

# Get the program ID from keypair
PROGRAM_ID=$(solana-keygen pubkey $PROGRAM_KEYPAIR)

echo "==> Updating program ID to $PROGRAM_ID..."

# Update lib.rs
sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" programs/mirage-bridge/src/lib.rs

# Update Anchor.toml (both localnet and devnet)
sed -i "s/address = \"[^\"]*\"/address = \"$PROGRAM_ID\"/g" Anchor.toml

# Anchor requires keypair at target/deploy/ - symlink to program keypair
mkdir -p target/deploy
rm -f target/deploy/mirage_bridge-keypair.json
ln -s "$PROGRAM_KEYPAIR" target/deploy/mirage_bridge-keypair.json

echo "==> Building program..."
anchor build

# Update TypeScript config
echo "==> Updating scripts/common/config.ts..."
sed -i "s|export const PROGRAM_ID = new PublicKey(\"[^\"]*\");|export const PROGRAM_ID = new PublicKey(\"$PROGRAM_ID\");|" scripts/common/config.ts

echo ""
echo "==========================================="
echo "Build complete!"
echo "Program ID: $PROGRAM_ID"
echo ""
echo "lib.rs:            updated by this script"
echo "scripts/config.ts: updated by this script"
echo "==========================================="
