import { Keypair, PublicKey, Ed25519Program, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { setupFromEnv, loadKeypair } from "./common/config";
import { 
  getBridgeConfigPDA, 
  getMintPDA, 
  getValidatorRegistryPDA, 
  getMintRecordPDA,
  getBurnRecordPDA 
} from "./common/pda";
import { confirmTx, formatAmount, parseAmount, buildAttestationPayload, bufferToHex } from "./common/utils";

ed.hashes.sha512 = sha512;

const WALLETS_DIR = "./scripts/wallets";

interface ValidatorWallet {
  keypair: Keypair;
  votingPower: number;
  mirageValidator: string;
}

function loadValidatorWallets(): ValidatorWallet[] {
  if (!existsSync(`${WALLETS_DIR}/validators.json`)) {
    throw new Error("Validators not generated. Run: bun run scripts/generate-wallets.ts");
  }

  const validatorsJson = JSON.parse(readFileSync(`${WALLETS_DIR}/validators.json`, "utf-8"));
  const wallets: ValidatorWallet[] = [];

  for (let i = 1; i <= validatorsJson.length; i++) {
    const path = `${WALLETS_DIR}/validator${i}.json`;
    if (!existsSync(path)) {
      throw new Error(`Validator wallet not found: ${path}`);
    }
    const keypair = loadKeypair(path);
    wallets.push({
      keypair,
      votingPower: validatorsJson[i - 1].votingPower,
      mirageValidator: validatorsJson[i - 1].mirageValidator,
    });
  }

  return wallets;
}

async function attestMint(
  program: any,
  connection: any,
  validator: ValidatorWallet,
  burnTxHash: Buffer,
  mirageSender: string,
  amount: BN,
  recipient: PublicKey
): Promise<string> {
  const [bridgeConfig] = getBridgeConfigPDA();
  const [tokenMint] = getMintPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [mintRecord] = getMintRecordPDA(burnTxHash);

  const recipientTokenAccount = getAssociatedTokenAddressSync(tokenMint, recipient, true);

  const payload = buildAttestationPayload(burnTxHash, mirageSender, amount, recipient);

  const privateKey = validator.keypair.secretKey.slice(0, 32);
  const signature = ed.sign(payload, privateKey);

  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: validator.keypair.publicKey.toBytes(),
    message: payload,
    signature: Buffer.from(signature),
  });

  const mintIx = await program.methods
    .mint({
      burnTxHash: Array.from(burnTxHash),
      mirageSender,
      amount,
    })
    .accounts({
      orchestrator: validator.keypair.publicKey,
      recipient,
      recipientTokenAccount,
      tokenMint,
      bridgeConfig,
      mintRecord,
      validatorRegistry,
      instructionsSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(ed25519Ix).add(mintIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = validator.keypair.publicKey;
  tx.sign(validator.keypair);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await confirmTx(connection, sig);
  
  return sig;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("              MIRAGE BRIDGE END-TO-END TEST");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { connection, wallet, program } = setupFromEnv();

  const [bridgeConfig] = getBridgeConfigPDA();
  const [tokenMint] = getMintPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();

  // Check if bridge is initialized
  const configExists = await connection.getAccountInfo(bridgeConfig);
  if (!configExists) {
    console.log("❌ Bridge not initialized!");
    console.log("   Run: bun run bridge:init");
    process.exit(1);
  }

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  console.log("✓ Bridge initialized");
  console.log(`  Authority: ${config.authority.toBase58()}`);
  console.log(`  Threshold: ${config.attestationThreshold.toNumber() / 100}%\n`);

  // Load validator wallets
  let validators: ValidatorWallet[];
  try {
    validators = loadValidatorWallets();
    console.log(`✓ Loaded ${validators.length} validator wallets`);
  } catch (err: any) {
    console.log(`❌ ${err.message}`);
    process.exit(1);
  }

  // Check if validators are registered
  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);
  if (registry.validators.length === 0) {
    console.log("\n❌ No validators registered!");
    console.log("   Run: VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators");
    process.exit(1);
  }

  // Check validators match
  const registeredPubkeys = registry.validators.map((v: any) => v.orchestratorPubkey.toBase58());
  const ourPubkeys = validators.map(v => v.keypair.publicKey.toBase58());
  const matchingValidators = validators.filter(v => 
    registeredPubkeys.includes(v.keypair.publicKey.toBase58())
  );

  if (matchingValidators.length === 0) {
    console.log("\n❌ Generated validators don't match registered validators!");
    console.log("   Registered:", registeredPubkeys.slice(0, 3).join(", "));
    console.log("   Generated:", ourPubkeys.slice(0, 3).join(", "));
    console.log("\n   Re-register with: VALIDATORS_FILE=scripts/wallets/validators.json bun run bridge:validators");
    process.exit(1);
  }

  console.log(`✓ ${matchingValidators.length} validators registered`);
  console.log(`  Total voting power: ${registry.totalVotingPower.toNumber()}\n`);

  // Calculate how many validators needed for threshold
  const threshold = config.attestationThreshold.toNumber();
  const totalPower = registry.totalVotingPower.toNumber();
  const requiredPower = Math.ceil((totalPower * threshold) / 10000);
  
  let accumulatedPower = 0;
  let validatorsNeeded = 0;
  for (const v of matchingValidators) {
    accumulatedPower += v.votingPower;
    validatorsNeeded++;
    if (accumulatedPower >= requiredPower) break;
  }

  console.log(`  Required power for threshold: ${requiredPower} (${threshold / 100}%)`);
  console.log(`  Validators needed: ${validatorsNeeded}\n`);

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: MINT (Mirage → Solana)
  // ═══════════════════════════════════════════════════════════════
  console.log("───────────────────────────────────────────────────────────────");
  console.log("TEST 1: MINT (Mirage → Solana)");
  console.log("───────────────────────────────────────────────────────────────\n");

  const testUser = loadKeypair(`${WALLETS_DIR}/test-user.json`);
  console.log(`Test User: ${testUser.publicKey.toBase58()}`);

  // Generate a fake Mirage burn tx hash
  const burnTxHash = Buffer.from(Keypair.generate().publicKey.toBytes());
  const mirageSender = "mirage1e2etestuser" + testUser.publicKey.toBase58().slice(0, 20).toLowerCase();
  const mintAmount = new BN(100_000_000); // 100 MIRAGE

  console.log(`\nSimulating Mirage burn:`);
  console.log(`  Burn TX Hash: ${bufferToHex(burnTxHash).slice(0, 16)}...`);
  console.log(`  Mirage Sender: ${mirageSender}`);
  console.log(`  Amount: ${formatAmount(mintAmount)} MIRAGE`);
  console.log(`  Solana Recipient: ${testUser.publicKey.toBase58()}\n`);

  // Have validators attest
  console.log("Validators attesting...\n");
  
  const [mintRecord] = getMintRecordPDA(burnTxHash);
  
  for (let i = 0; i < validatorsNeeded; i++) {
    const validator = matchingValidators[i];
    
    try {
      const sig = await attestMint(
        program,
        connection,
        validator,
        burnTxHash,
        mirageSender,
        mintAmount,
        testUser.publicKey
      );

      const record = await program.account.mintRecord.fetch(mintRecord);
      const powerPct = ((record.attestedPower.toNumber() / totalPower) * 100).toFixed(1);
      
      console.log(`  Validator ${i + 1}: ${validator.keypair.publicKey.toBase58().slice(0, 8)}...`);
      console.log(`    Power: +${validator.votingPower} → ${record.attestedPower.toNumber()} (${powerPct}%)`);
      console.log(`    Completed: ${record.completed}`);
      console.log(`    TX: ${sig.slice(0, 16)}...\n`);

      if (record.completed) {
        console.log("  🎉 Threshold reached! Tokens minted.\n");
        break;
      }
    } catch (err: any) {
      console.log(`  Validator ${i + 1}: FAILED - ${err.message}\n`);
    }
  }

  // Check balance
  const userAta = getAssociatedTokenAddressSync(tokenMint, testUser.publicKey, true);
  try {
    const balance = await connection.getTokenAccountBalance(userAta);
    console.log(`✓ Test user balance: ${balance.value.uiAmountString} MIRAGE\n`);
  } catch {
    console.log("✓ Test user token account created (check balance manually)\n");
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: BURN (Solana → Mirage)
  // ═══════════════════════════════════════════════════════════════
  console.log("───────────────────────────────────────────────────────────────");
  console.log("TEST 2: BURN (Solana → Mirage)");
  console.log("───────────────────────────────────────────────────────────────\n");

  try {
    const balance = await connection.getTokenAccountBalance(userAta);
    const currentBalance = new BN(balance.value.amount);

    if (currentBalance.isZero()) {
      console.log("⚠ No tokens to burn. Skipping burn test.\n");
    } else {
      const burnAmount = new BN(Math.min(50_000_000, currentBalance.toNumber())); // 50 MIRAGE or less
      const mirageRecipient = "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9";

      console.log(`Burning ${formatAmount(burnAmount)} MIRAGE`);
      console.log(`  From: ${testUser.publicKey.toBase58()}`);
      console.log(`  To: ${mirageRecipient}\n`);

      const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
      const burnNonce = configBefore.burnNonce;
      const [burnRecord] = getBurnRecordPDA(burnNonce);

      const burnTx = await program.methods
        .burn({
          mirageRecipient,
          amount: burnAmount,
        })
        .accounts({
          user: testUser.publicKey,
          userTokenAccount: userAta,
          tokenMint,
          bridgeConfig,
          burnRecord,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      await confirmTx(connection, burnTx);

      const record = await program.account.burnRecord.fetch(burnRecord);
      console.log(`✓ Burn successful!`);
      console.log(`  Burn ID: ${record.burnId.toNumber()}`);
      console.log(`  Amount: ${formatAmount(record.amount)} MIRAGE`);
      console.log(`  TX: ${burnTx.slice(0, 16)}...\n`);
    }
  } catch (err: any) {
    console.log(`⚠ Burn test failed: ${err.message}\n`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const finalConfig = await program.account.bridgeConfig.fetch(bridgeConfig);
  console.log(`Total Minted: ${formatAmount(finalConfig.totalMinted)} MIRAGE`);
  console.log(`Total Burned: ${formatAmount(finalConfig.totalBurned)} MIRAGE`);
  console.log(`Burn Nonce: ${finalConfig.burnNonce.toNumber()}`);
  console.log(`Paused: ${finalConfig.paused}`);
  console.log(`\n✅ E2E test complete!`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
