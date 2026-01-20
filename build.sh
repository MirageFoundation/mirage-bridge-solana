#!/bin/bash
# Build script that ensures program ID is always in sync
# Usage: ./build.sh

set -e

echo "==> Syncing program ID with keypair..."
anchor keys sync

echo "==> Building program..."
anchor build

# Get the program ID from keypair
PROGRAM_ID=$(solana-keygen pubkey target/deploy/mirage_bridge-keypair.json)

# Update TypeScript config
echo "==> Updating scripts/common/config.ts..."
sed -i "s|export const PROGRAM_ID = new PublicKey(\"[^\"]*\");|export const PROGRAM_ID = new PublicKey(\"$PROGRAM_ID\");|" scripts/common/config.ts

echo ""
echo "==========================================="
echo "Build complete!"
echo "Program ID: $PROGRAM_ID"
echo ""
echo "lib.rs:            updated by 'anchor keys sync'"
echo "scripts/config.ts: updated by this script"
echo "==========================================="
