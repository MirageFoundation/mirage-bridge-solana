import { SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { existsSync, readFileSync } from "fs";
import { setupFromEnv, loadKeypair } from "./common/config";
import { getBridgeConfigPDA, getValidatorRegistryPDA, getMintPDA, logPDAs } from "./common/pda";
import { confirmTx } from "./common/utils";

const WALLETS_DIR = "./scripts/wallets";
const MIN_BALANCE = 0.5 * LAMPORTS_PER_SOL; // 0.5 SOL minimum
const FUND_AMOUNT = 0.5 * LAMPORTS_PER_SOL; // Fund 0.5 SOL

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("              BRIDGE SETUP");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { connection, wallet, program, network } = setupFromEnv();

  const useTransfer = network === "devnet" || network === "mainnet";

  logPDAs();
  console.log("");

  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [tokenMint] = getMintPDA();

  // Step 1: Check if bridge is initialized
  console.log("Step 1: Initialize Bridge\n");
  
  const existingConfig = await connection.getAccountInfo(bridgeConfig);
  if (existingConfig) {
    console.log("  ✓ Bridge already initialized\n");
  } else {
    console.log("  Initializing bridge...");
    
    const tx = await program.methods
      .initialize({
        mirageChainId: "mirage-1",
        attestationThreshold: new BN(6667),
      })
      .accounts({
        authority: wallet.publicKey,
        bridgeConfig,
        validatorRegistry,
        tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([wallet])
      .rpc();

    await confirmTx(connection, tx);
    console.log(`  ✓ Bridge initialized (tx: ${tx.slice(0, 16)}...)\n`);
  }

  // Step 2: Check for validator wallets
  console.log("Step 2: Register Validators\n");

  const validatorsPath = `${WALLETS_DIR}/validators.json`;
  if (!existsSync(validatorsPath)) {
    console.log("  ❌ Validator wallets not found!");
    console.log("     Run: bun run bridge:generate-wallets\n");
    process.exit(1);
  }

  const validatorsJson = JSON.parse(readFileSync(validatorsPath, "utf-8"));
  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);

  if (registry.validators.length > 0) {
    const registeredPubkeys = registry.validators.map((v: any) => v.orchestratorPubkey.toBase58());
    const configPubkeys = validatorsJson.map((v: any) => v.orchestratorPubkey);
    
    const match = configPubkeys.every((pk: string) => registeredPubkeys.includes(pk));
    
    if (match) {
      console.log(`  ✓ ${registry.validators.length} validators already registered\n`);
    } else {
      console.log("  Updating validators (mismatch detected)...");
      await updateValidators(program, wallet, connection, bridgeConfig, validatorRegistry, validatorsJson);
    }
  } else {
    console.log("  Registering validators...");
    await updateValidators(program, wallet, connection, bridgeConfig, validatorRegistry, validatorsJson);
  }

  // Step 3: Fund validator wallets
  console.log("Step 3: Fund Wallets\n");

  if (useTransfer) {
    console.log(`  Mode: Transfer from authority (${network})`);
    const authorityBalance = await connection.getBalance(wallet.publicKey);
    console.log(`  Authority balance: ${(authorityBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);
  } else {
    console.log(`  Mode: Airdrop (localnet)\n`);
  }

  const walletsToFund = [
    { path: `${WALLETS_DIR}/test-user.json`, name: "Test User" },
  ];

  for (let i = 1; i <= validatorsJson.length; i++) {
    walletsToFund.push({
      path: `${WALLETS_DIR}/validator${i}.json`,
      name: `Validator ${i}`,
    });
  }

  for (const { path, name } of walletsToFund) {
    if (!existsSync(path)) {
      console.log(`  ⚠ ${name}: Wallet not found (${path})`);
      continue;
    }

    const keypair = loadKeypair(path);
    const balance = await connection.getBalance(keypair.publicKey);
    
    if (balance >= MIN_BALANCE) {
      console.log(`  ✓ ${name}: ${keypair.publicKey.toBase58().slice(0, 8)}... has ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      continue;
    }

    const needed = FUND_AMOUNT - balance;

    try {
      if (useTransfer) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: keypair.publicKey,
            lamports: needed,
          })
        );
        await sendAndConfirmTransaction(connection, tx, [wallet]);
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`  ✓ ${name}: ${keypair.publicKey.toBase58().slice(0, 8)}... → ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (transferred)`);
      } else {
        const sig = await connection.requestAirdrop(keypair.publicKey, needed);
        await confirmTx(connection, sig);
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`  ✓ ${name}: ${keypair.publicKey.toBase58().slice(0, 8)}... → ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (airdrop)`);
      }
    } catch (err: any) {
      console.log(`  ⚠ ${name}: Failed - ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    SETUP COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`Authority remaining: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log("\nNext steps:");
  console.log("  1. Run E2E test: bun run bridge:e2e");
  console.log("  2. Check status: bun run bridge:status");
  console.log("");
}

async function updateValidators(
  program: any,
  wallet: any,
  connection: any,
  bridgeConfig: any,
  validatorRegistry: any,
  validatorsJson: any[]
) {
  const { PublicKey } = await import("@solana/web3.js");
  
  const validators = validatorsJson.map((v) => ({
    orchestratorPubkey: new PublicKey(v.orchestratorPubkey),
    mirageValidator: v.mirageValidator,
    votingPower: new BN(v.votingPower),
  }));

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
  
  console.log(`  ✓ ${validators.length} validators registered (tx: ${tx.slice(0, 16)}...)\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
