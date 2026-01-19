import BN from "bn.js";
import { setupFromEnv } from "./common/config";
import { getBurnRecordPDA, logPDAs } from "./common/pda";
import { formatAmount } from "./common/utils";

async function main() {
  console.log("=== Get Burn Record ===\n");
  
  const { program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const burnIdStr = process.env.BURN_ID;
  if (!burnIdStr) {
    console.log("❌ BURN_ID env var required");
    process.exit(1);
  }

  const burnId = new BN(burnIdStr);
  const [burnRecord] = getBurnRecordPDA(burnId);

  console.log(`Looking up burn ID: ${burnId.toNumber()}`);
  console.log(`Burn Record PDA: ${burnRecord.toBase58()}`);
  console.log("");

  const record = await program.account.burnRecord.fetch(burnRecord).catch(() => null);
  
  if (!record) {
    console.log("❌ Burn record not found!");
    process.exit(1);
  }

  console.log(`Burn Record:`);
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
