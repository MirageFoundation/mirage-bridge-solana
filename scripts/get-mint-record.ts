import { setupFromEnv } from "./common/config";
import { getMintRecordPDA, getValidatorRegistryPDA, getBridgeConfigPDA, logPDAs } from "./common/pda";
import { formatAmount, hexToBuffer, shortPubkey } from "./common/utils";

async function main() {
  console.log("=== Get Mint Record ===\n");
  
  const { program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const burnTxHashHex = process.env.BURN_TX_HASH;
  if (!burnTxHashHex) {
    console.log("❌ BURN_TX_HASH env var required (32-byte hex)");
    process.exit(1);
  }

  const burnTxHash = hexToBuffer(burnTxHashHex);
  if (burnTxHash.length !== 32) {
    console.log(`❌ BURN_TX_HASH must be 32 bytes (got ${burnTxHash.length})`);
    process.exit(1);
  }

  const [mintRecord] = getMintRecordPDA(burnTxHash);
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [bridgeConfig] = getBridgeConfigPDA();

  console.log(`Looking up burn tx hash: ${burnTxHashHex}`);
  console.log(`Mint Record PDA: ${mintRecord.toBase58()}`);
  console.log("");

  const record = await program.account.mintRecord.fetch(mintRecord).catch(() => null);
  
  if (!record) {
    console.log("❌ Mint record not found!");
    process.exit(1);
  }

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);

  console.log(`Mint Record:`);
  console.log(`  Burn TX Hash: ${burnTxHashHex}`);
  console.log(`  Recipient: ${record.recipient.toBase58()}`);
  console.log(`  Amount: ${formatAmount(record.amount)} MIRAGE`);
  console.log(`  Completed: ${record.completed}`);
  if (record.completedAt) {
    console.log(`  Completed At: ${new Date(record.completedAt.toNumber() * 1000).toISOString()}`);
  }
  
  console.log(`\nAttestations:`);
  console.log(`  Count: ${record.attestations.length}`);
  console.log(`  Attested Power: ${record.attestedPower.toNumber()}`);
  
  const threshold = config.attestationThreshold.toNumber();
  const required = Math.ceil((registry.totalVotingPower.toNumber() * threshold) / 10000);
  console.log(`  Required Power: ${required} (${threshold / 100}% of ${registry.totalVotingPower.toNumber()})`);
  
  if (!record.completed) {
    console.log(`  Remaining: ${required - record.attestedPower.toNumber()}`);
  }

  if (record.attestations.length > 0) {
    console.log(`\n  Attestors:`);
    for (const attestor of record.attestations) {
      const validator = registry.validators.find(v => v.orchestratorPubkey.equals(attestor));
      const power = validator?.votingPower.toNumber() || "?";
      console.log(`    - ${shortPubkey(attestor)} (power: ${power})`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
