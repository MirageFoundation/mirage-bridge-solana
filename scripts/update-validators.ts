import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getValidatorRegistryPDA, logPDAs } from "./common/pda";
import { confirmTx, shortPubkey } from "./common/utils";

interface ValidatorConfig {
  orchestratorPubkey: string;
  mirageValidator: string;
  stake: string; // umirage (smallest unit, no decimals)
}

/**
 * Load validator configs from scripts/validators/*.json
 * Each file should contain: { orchestratorPubkey, mirageValidator, stake }
 * Stake must be an integer (umirage - smallest unit, no decimals)
 */
function loadValidators(validatorsDir: string): ValidatorConfig[] {
  const files = readdirSync(validatorsDir)
    .filter(f => f.endsWith(".json"))
    .sort();
  
  if (files.length === 0) {
    throw new Error(`No .json files found in ${validatorsDir}`);
  }

  const validators: ValidatorConfig[] = [];

  for (const file of files) {
    const filePath = join(validatorsDir, file);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    
    if (!data.orchestratorPubkey || !data.mirageValidator || data.stake === undefined) {
      throw new Error(`Invalid validator config in ${file}. Required: orchestratorPubkey, mirageValidator, stake`);
    }

    // Stake must be integer (umirage - smallest unit)
    const stakeStr = String(data.stake);
    if (stakeStr.includes('.')) {
      throw new Error(`Invalid stake in ${file}: "${data.stake}" - must be integer (umirage, no decimals)`);
    }

    validators.push({
      orchestratorPubkey: data.orchestratorPubkey,
      mirageValidator: data.mirageValidator,
      stake: stakeStr,
    });
  }

  return validators;
}

async function main() {
  console.log("=== Update Validators ===\n");
  
  const { connection, wallet, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  if (!config.authority.equals(wallet.publicKey)) {
    console.log(`❌ Wallet is not the authority!`);
    console.log(`  Expected: ${config.authority.toBase58()}`);
    console.log(`  Got: ${wallet.publicKey.toBase58()}`);
    process.exit(1);
  }

  // Load validator configs from scripts/validators/
  const validatorsDir = process.env.VALIDATORS_DIR || "scripts/validators";
  console.log(`Loading validators from: ${validatorsDir}/*.json`);
  const validatorConfigs = loadValidators(validatorsDir);

  const validators = validatorConfigs.map((v) => ({
    orchestratorPubkey: new PublicKey(v.orchestratorPubkey),
    mirageValidator: v.mirageValidator,
    stake: new BN(v.stake),
  }));

  console.log(`\nUpdating validator set (${validators.length} validators):`);
  let totalStake = new BN(0);
  for (let i = 0; i < validatorConfigs.length; i++) {
    const v = validatorConfigs[i];
    const stake = validators[i].stake;
    console.log(`  ${v.orchestratorPubkey.slice(0, 8)}... | ${v.mirageValidator} | stake: ${stake.toString()}`);
    totalStake = totalStake.add(stake);
  }
  console.log(`  Total stake: ${totalStake.toString()}`);
  console.log("");

  const tx = await program.methods
    .updateValidators({ validators })
    .accounts({
      authority: wallet.publicKey,
      bridgeConfig,
      validatorRegistry,
    })
    .signers([wallet])
    .rpc();

  await confirmTx(connection, tx);

  console.log(`✅ Validators updated!`);
  console.log(`  Transaction: ${tx}`);

  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);
  console.log(`\nValidator Registry:`);
  console.log(`  Count: ${registry.validators.length}`);
  console.log(`  Total Stake: ${registry.totalStake.toString()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
