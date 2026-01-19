import { PublicKey, Transaction } from "@solana/web3.js";
import { 
  createMintToInstruction, 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import BN from "bn.js";
import { setupFromEnv, loadKeypair } from "./common/config";
import { getBridgeConfigPDA, getMintPDA } from "./common/pda";
import { confirmTx, formatAmount, parseAmount } from "./common/utils";

async function main() {
  console.log("=== Mint Tokens to User (Admin) ===\n");
  console.log("NOTE: This mints tokens directly using bridge authority.");
  console.log("Only works because bridge_config PDA is the mint authority.\n");
  
  const { connection, wallet, program } = setupFromEnv();

  const recipientStr = process.env.RECIPIENT;
  const amountStr = process.env.AMOUNT || "1000";

  if (!recipientStr) {
    console.log("❌ RECIPIENT env var required (Solana pubkey)");
    console.log("   Example: RECIPIENT=<pubkey> AMOUNT=1000 bun run scripts/mint-to-user.ts");
    process.exit(1);
  }

  const recipient = new PublicKey(recipientStr);
  const amount = parseAmount(amountStr);

  const [bridgeConfig, bridgeConfigBump] = getBridgeConfigPDA();
  const [tokenMint] = getMintPDA();

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  
  if (!config.authority.equals(wallet.publicKey)) {
    console.log("❌ Only bridge authority can use this script!");
    console.log(`   Expected: ${config.authority.toBase58()}`);
    console.log(`   Got: ${wallet.publicKey.toBase58()}`);
    process.exit(1);
  }

  const recipientAta = getAssociatedTokenAddressSync(tokenMint, recipient, true);

  console.log(`Minting ${formatAmount(amount)} MIRAGE to ${recipient.toBase58()}`);
  console.log(`Token Account: ${recipientAta.toBase58()}\n`);

  // Check if ATA exists
  const ataInfo = await connection.getAccountInfo(recipientAta);
  
  const tx = await program.methods
    .adminMint({ amount })
    .accounts({
      authority: wallet.publicKey,
      recipient,
      recipientTokenAccount: recipientAta,
      tokenMint,
      bridgeConfig,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: new PublicKey("11111111111111111111111111111111"),
    })
    .signers([wallet])
    .rpc()
    .catch(async (err) => {
      // If admin_mint doesn't exist, we need to add it to the program
      // For now, let's show a helpful message
      console.log("❌ admin_mint instruction not found in program.");
      console.log("   The bridge program needs an admin_mint instruction for testing.");
      console.log("   Alternatively, use the full mint flow with validator attestations.");
      throw err;
    });

  await confirmTx(connection, tx);

  console.log(`✅ Minted ${formatAmount(amount)} MIRAGE!`);
  console.log(`   Transaction: ${tx}`);

  const balance = await connection.getTokenAccountBalance(recipientAta);
  console.log(`   New Balance: ${balance.value.uiAmountString} MIRAGE`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
