import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getBridgeStatePDA, getValidatorRegistryPDA, getMintPDA, logPDAs } from "./common/pda";
import { formatAmount, shortPubkey } from "./common/utils";

async function main() {
  console.log("=== Bridge Status ===\n");
  
  const { connection, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [bridgeState] = getBridgeStatePDA();
  const [tokenMint] = getMintPDA();

  const configExists = await connection.getAccountInfo(bridgeConfig);
  if (!configExists) {
    console.log("❌ Bridge not initialized!");
    process.exit(1);
  }

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);
  const state = await program.account.bridgeState.fetch(bridgeState);

  console.log(`\nBridge Config:`);
  console.log(`  Authority: ${config.authority.toBase58()}`);
  console.log(`  Mint: ${config.mint.toBase58()}`);
  console.log(`  Chain ID: ${config.mirageChainId}`);
  console.log(`  Attestation Threshold: ${config.attestationThreshold.toNumber()} basis points (${config.attestationThreshold.toNumber() / 100}%)`);
  console.log(`  Paused: ${config.paused}`);

  console.log(`\nStatistics:`);
  console.log(`  Total Minted: ${formatAmount(config.totalMinted)} MIRAGE`);
  console.log(`  Total Burned: ${formatAmount(config.totalBurned)} MIRAGE`);
  console.log(`  Burn Nonce: ${config.burnNonce.toNumber()}`);

  console.log(`\nReplay Protection:`);
  console.log(`  Last Sequence: ${state.lastSequence.toNumber()}`);

  console.log(`\nValidator Registry:`);
  console.log(`  Total Validators: ${registry.validators.length}`);
  console.log(`  Total Stake: ${registry.totalStake.toNumber()}`);
  
  if (registry.validators.length > 0) {
    console.log(`\n  Validators:`);
    for (const v of registry.validators) {
      const stakePercent = ((v.stake.toNumber() / registry.totalStake.toNumber()) * 100).toFixed(2);
      console.log(`    - ${shortPubkey(v.orchestratorPubkey)} | ${v.mirageValidator} | ${v.stake.toNumber()} (${stakePercent}%)`);
    }
  }

  const mintInfo = await connection.getAccountInfo(tokenMint);
  if (mintInfo) {
    const { MintLayout } = await import("@solana/spl-token");
    const mintData = MintLayout.decode(mintInfo.data);
    console.log(`\nToken Mint:`);
    console.log(`  Supply: ${formatAmount(Number(mintData.supply))} MIRAGE`);
    console.log(`  Decimals: ${mintData.decimals}`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
