import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getMintPDA, getBurnRecordPDA, logPDAs } from "./common/pda";
import { confirmTx, formatAmount, parseAmount } from "./common/utils";

async function main() {
  console.log("=== Burn MIRAGE ===\n");
  
  const { connection, wallet, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const mirageRecipient = process.env.RECIPIENT;
  const amountStr = process.env.AMOUNT;

  if (!mirageRecipient) {
    console.log("❌ RECIPIENT env var required (mirage1... address)");
    process.exit(1);
  }

  if (!amountStr) {
    console.log("❌ AMOUNT env var required (e.g., 100 for 100 MIRAGE)");
    process.exit(1);
  }

  if (!mirageRecipient.startsWith("mirage1")) {
    console.log("❌ Invalid recipient address. Must start with 'mirage1'");
    process.exit(1);
  }

  const amount = parseAmount(amountStr);
  const [bridgeConfig] = getBridgeConfigPDA();
  const [tokenMint] = getMintPDA();

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  
  if (config.paused) {
    console.log("❌ Bridge is paused!");
    process.exit(1);
  }

  const burnNonce = config.burnNonce;
  const [burnRecord] = getBurnRecordPDA(burnNonce);

  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey, true);
  
  const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount).catch(() => null);
  if (!tokenBalance) {
    console.log(`❌ No token account found for wallet`);
    console.log(`  Token Account: ${userTokenAccount.toBase58()}`);
    process.exit(1);
  }

  const balanceAmount = new BN(tokenBalance.value.amount);
  if (balanceAmount.lt(amount)) {
    console.log(`❌ Insufficient balance!`);
    console.log(`  Required: ${formatAmount(amount)} MIRAGE`);
    console.log(`  Available: ${formatAmount(balanceAmount)} MIRAGE`);
    process.exit(1);
  }

  console.log(`Burning:`);
  console.log(`  Amount: ${formatAmount(amount)} MIRAGE`);
  console.log(`  Recipient: ${mirageRecipient}`);
  console.log(`  Burn ID: ${burnNonce.toNumber()}`);
  console.log(`  From: ${wallet.publicKey.toBase58()}`);
  console.log("");

  const tx = await program.methods
    .burn({
      mirageRecipient,
      amount,
    })
    .accounts({
      user: wallet.publicKey,
      userTokenAccount,
      tokenMint,
      bridgeConfig,
      burnRecord,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  await confirmTx(connection, tx);

  console.log(`✅ Burn successful!`);
  console.log(`  Transaction: ${tx}`);
  console.log(`  Burn ID: ${burnNonce.toNumber()}`);

  const record = await program.account.burnRecord.fetch(burnRecord);
  console.log(`\nBurn Record:`);
  console.log(`  Burn ID: ${record.burnId.toNumber()}`);
  console.log(`  Amount: ${formatAmount(record.amount)} MIRAGE`);
  console.log(`  Mirage Recipient: ${record.mirageRecipient}`);
  console.log(`  Solana Sender: ${record.solanaSender.toBase58()}`);
  console.log(`  Timestamp: ${new Date(record.timestamp.toNumber() * 1000).toISOString()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
