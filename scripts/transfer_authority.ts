import { PublicKey } from "@solana/web3.js";
import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getBridgeStatePDA } from "./common/pda";
import { confirmTx } from "./common/utils";

// Usage: 
//   bun run scripts/transfer_authority.ts <new_authority_pubkey>
//
// Example:
//   bun run scripts/transfer_authority.ts BcedynFvVZPchs5ASyh3ypLdnH26GXLUpagg2fHG4b2C

async function main() {
  console.log("=== Transfer Bridge Authority ===\n");

  const newAuthorityArg = process.argv[2];
  if (!newAuthorityArg) {
    console.log("Usage: bun run scripts/transfer_authority.ts <new_authority_pubkey>");
    console.log("\nExample:");
    console.log("  bun run scripts/transfer_authority.ts BcedynFvVZPchs5ASyh3ypLdnH26GXLUpagg2fHG4b2C");
    process.exit(1);
  }

  let newAuthority: PublicKey;
  try {
    newAuthority = new PublicKey(newAuthorityArg);
  } catch {
    console.error("❌ Invalid public key:", newAuthorityArg);
    process.exit(1);
  }

  const { connection, wallet, program } = setupFromEnv();

  const [bridgeConfig] = getBridgeConfigPDA();
  const [bridgeState] = getBridgeStatePDA();

  // Fetch current config
  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  const currentAuthority = config.authority.toBase58();

  console.log(`Current authority: ${currentAuthority}`);
  console.log(`New authority:     ${newAuthority.toBase58()}`);
  console.log(`Signer:            ${wallet.publicKey.toBase58()}`);
  console.log("");

  if (currentAuthority !== wallet.publicKey.toBase58()) {
    console.error("❌ Your wallet is not the current authority!");
    console.error(`   Current authority: ${currentAuthority}`);
    console.error(`   Your wallet:       ${wallet.publicKey.toBase58()}`);
    process.exit(1);
  }

  if (currentAuthority === newAuthority.toBase58()) {
    console.error("❌ New authority is the same as current authority!");
    process.exit(1);
  }

  console.log("Transferring authority...\n");

  const tx = await program.methods
    .transferAuthority({
      newAuthority,
    })
    .accounts({
      authority: wallet.publicKey,
      bridgeConfig,
      bridgeState,
    })
    .signers([wallet])
    .rpc();

  await confirmTx(connection, tx);

  console.log(`✅ Authority transferred!`);
  console.log(`  Transaction: ${tx}`);

  // Verify
  const updatedConfig = await program.account.bridgeConfig.fetch(bridgeConfig);
  console.log(`\nVerified new authority: ${updatedConfig.authority.toBase58()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
