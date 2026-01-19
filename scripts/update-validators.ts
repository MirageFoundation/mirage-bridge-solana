import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { setupFromEnv, loadKeypair } from "./common/config";
import { getBridgeConfigPDA, getValidatorRegistryPDA, logPDAs } from "./common/pda";
import { confirmTx, shortPubkey } from "./common/utils";

interface ValidatorInput {
  orchestratorPubkey: string;
  mirageValidator: string;
  votingPower: number;
}

function parseValidatorsFromEnv(): ValidatorInput[] {
  const validatorsJson = process.env.VALIDATORS;
  if (!validatorsJson) {
    throw new Error("VALIDATORS env var required. Format: JSON array of {orchestratorPubkey, mirageValidator, votingPower}");
  }
  return JSON.parse(validatorsJson);
}

function parseValidatorsFromFile(path: string): ValidatorInput[] {
  const { readFileSync } = require("fs");
  return JSON.parse(readFileSync(path, "utf-8"));
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

  let validatorInputs: ValidatorInput[];
  
  const validatorsFile = process.env.VALIDATORS_FILE;
  if (validatorsFile) {
    console.log(`Loading validators from file: ${validatorsFile}`);
    validatorInputs = parseValidatorsFromFile(validatorsFile);
  } else {
    validatorInputs = parseValidatorsFromEnv();
  }

  const validators = validatorInputs.map((v) => ({
    orchestratorPubkey: new PublicKey(v.orchestratorPubkey),
    mirageValidator: v.mirageValidator,
    votingPower: new BN(v.votingPower),
  }));

  console.log(`\nUpdating validator set (${validators.length} validators):`);
  let totalPower = 0;
  for (const v of validators) {
    console.log(`  ${shortPubkey(v.orchestratorPubkey)} | ${v.mirageValidator} | power: ${v.votingPower.toNumber()}`);
    totalPower += v.votingPower.toNumber();
  }
  console.log(`  Total voting power: ${totalPower}`);
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
  console.log(`  Total Voting Power: ${registry.totalVotingPower.toNumber()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
