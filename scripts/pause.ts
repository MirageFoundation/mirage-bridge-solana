import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, logPDAs } from "./common/pda";
import { confirmTx } from "./common/utils";

async function main() {
  console.log("=== Pause Bridge ===\n");
  
  const { connection, wallet, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const [bridgeConfig] = getBridgeConfigPDA();

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  
  if (!config.authority.equals(wallet.publicKey)) {
    console.log(`❌ Wallet is not the authority!`);
    console.log(`  Expected: ${config.authority.toBase58()}`);
    console.log(`  Got: ${wallet.publicKey.toBase58()}`);
    process.exit(1);
  }

  if (config.paused) {
    console.log("❌ Bridge is already paused!");
    process.exit(1);
  }

  console.log(`Pausing bridge...`);
  console.log("");

  const tx = await program.methods
    .pause()
    .accounts({
      authority: wallet.publicKey,
      bridgeConfig,
    })
    .signers([wallet])
    .rpc();

  await confirmTx(connection, tx);

  console.log(`✅ Bridge paused!`);
  console.log(`  Transaction: ${tx}`);

  const configAfter = await program.account.bridgeConfig.fetch(bridgeConfig);
  console.log(`\nBridge Status:`);
  console.log(`  Paused: ${configAfter.paused}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
