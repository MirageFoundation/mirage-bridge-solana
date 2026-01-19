import { Keypair } from "@solana/web3.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const WALLETS_DIR = "./scripts/wallets";

function generateWallet(name: string): { keypair: Keypair; path: string } {
  const keypair = Keypair.generate();
  const path = `${WALLETS_DIR}/${name}.json`;
  
  writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)));
  
  return { keypair, path };
}

async function main() {
  console.log("=== Generate Test Wallets ===\n");

  if (!existsSync(WALLETS_DIR)) {
    mkdirSync(WALLETS_DIR, { recursive: true });
  }

  const numValidators = parseInt(process.env.NUM_VALIDATORS || "3");
  
  console.log(`Generating ${numValidators} validator wallets...\n`);

  const validators: Array<{
    orchestratorPubkey: string;
    mirageValidator: string;
    votingPower: number;
  }> = [];

  for (let i = 1; i <= numValidators; i++) {
    const { keypair, path } = generateWallet(`validator${i}`);
    
    const votingPower = Math.floor(10000 / numValidators);
    
    validators.push({
      orchestratorPubkey: keypair.publicKey.toBase58(),
      mirageValidator: `miragevaloper1validator${i}test${keypair.publicKey.toBase58().slice(0, 8).toLowerCase()}`,
      votingPower,
    });

    console.log(`Validator ${i}:`);
    console.log(`  Pubkey: ${keypair.publicKey.toBase58()}`);
    console.log(`  File: ${path}`);
    console.log(`  Voting Power: ${votingPower}`);
    console.log("");
  }

  // Write validators JSON for use with update-validators script
  const validatorsPath = `${WALLETS_DIR}/validators.json`;
  writeFileSync(validatorsPath, JSON.stringify(validators, null, 2));
  console.log(`Validators JSON written to: ${validatorsPath}`);

  // Also generate a user wallet for testing burns
  const { keypair: userKeypair, path: userPath } = generateWallet("test-user");
  console.log(`\nTest User:`);
  console.log(`  Pubkey: ${userKeypair.publicKey.toBase58()}`);
  console.log(`  File: ${userPath}`);

  console.log(`\n✅ All wallets generated!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Fund wallets with SOL (airdrop on devnet/localnet)`);
  console.log(`  2. Initialize bridge: bun run bridge:init`);
  console.log(`  3. Register validators: VALIDATORS_FILE=${validatorsPath} bun run bridge:validators`);
  console.log(`  4. Mint tokens to test user for burn testing`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
