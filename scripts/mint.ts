import { PublicKey, Ed25519Program, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { setupFromEnv, loadKeypair } from "./common/config";
import { getBridgeConfigPDA, getBridgeStatePDA, getMintPDA, getValidatorRegistryPDA, getMintRecordPDA, logPDAs } from "./common/pda";
import { confirmTx, formatAmount, parseAmount, buildAttestationPayload, hexToBuffer } from "./common/utils";

ed.hashes.sha512 = sha512;

async function main() {
  console.log("=== Mint MIRAGE (Orchestrator Attestation) ===\n");
  
  const { connection, wallet, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const burnTxHashHex = process.env.BURN_TX_HASH;
  const mirageSender = process.env.MIRAGE_SENDER;
  const recipientPubkey = process.env.RECIPIENT;
  const amountStr = process.env.AMOUNT;
  const sequenceStr = process.env.SEQUENCE;

  if (!burnTxHashHex) {
    console.log("❌ BURN_TX_HASH env var required (32-byte hex)");
    process.exit(1);
  }

  if (!mirageSender) {
    console.log("❌ MIRAGE_SENDER env var required (mirage1... address)");
    process.exit(1);
  }

  if (!recipientPubkey) {
    console.log("❌ RECIPIENT env var required (Solana pubkey)");
    process.exit(1);
  }

  if (!amountStr) {
    console.log("❌ AMOUNT env var required (e.g., 100 for 100 MIRAGE)");
    process.exit(1);
  }

  if (!sequenceStr) {
    console.log("❌ SEQUENCE env var required (u64, monotonically increasing)");
    process.exit(1);
  }

  const burnTxHash = hexToBuffer(burnTxHashHex);
  if (burnTxHash.length !== 32) {
    console.log(`❌ BURN_TX_HASH must be 32 bytes (got ${burnTxHash.length})`);
    process.exit(1);
  }

  const amount = parseAmount(amountStr);
  const sequence = new BN(sequenceStr);
  const recipient = new PublicKey(recipientPubkey);

  const [bridgeConfig] = getBridgeConfigPDA();
  const [bridgeState] = getBridgeStatePDA();
  const [tokenMint] = getMintPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [mintRecord] = getMintRecordPDA(burnTxHash);

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  
  if (config.paused) {
    console.log("❌ Bridge is paused!");
    process.exit(1);
  }

  const registry = await program.account.validatorRegistry.fetch(validatorRegistry);
  const isValidator = registry.validators.some(
    (v) => v.orchestratorPubkey.equals(wallet.publicKey)
  );

  if (!isValidator) {
    console.log("❌ Wallet is not a registered orchestrator!");
    console.log(`  Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`  Registered validators:`);
    for (const v of registry.validators) {
      console.log(`    - ${v.orchestratorPubkey.toBase58()}`);
    }
    process.exit(1);
  }

  const existingRecord = await program.account.mintRecord.fetch(mintRecord).catch(() => null);
  const mintRecordPayer = existingRecord?.payer ?? wallet.publicKey;

  const recipientTokenAccount = getAssociatedTokenAddressSync(tokenMint, recipient, true);

  const payload = buildAttestationPayload(burnTxHash, mirageSender, amount, recipient);

  const privateKey = wallet.secretKey.slice(0, 32);
  const signature = ed.sign(payload, privateKey);

  const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
    publicKey: wallet.publicKey.toBytes(),
    message: payload,
    signature: Buffer.from(signature),
  });

  console.log(`Attesting mint:`);
  console.log(`  Burn TX Hash: ${burnTxHashHex}`);
  console.log(`  Mirage Sender: ${mirageSender}`);
  console.log(`  Amount: ${formatAmount(amount)} MIRAGE`);
  console.log(`  Recipient: ${recipient.toBase58()}`);
  console.log(`  Orchestrator: ${wallet.publicKey.toBase58()}`);
  console.log("");

  const mintIx = await program.methods
    .mint({
      burnTxHash: Array.from(burnTxHash),
      mirageSender,
      amount,
      sequence,
    })
    .accounts({
      orchestrator: wallet.publicKey,
      recipient,
      mintRecordPayer,
      recipientTokenAccount,
      tokenMint,
      bridgeConfig,
      bridgeState,
      mintRecord,
      validatorRegistry,
      instructionsSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = await program.provider.sendAndConfirm(
    new (await import("@solana/web3.js")).Transaction().add(ed25519Ix).add(mintIx),
    [wallet]
  );

  console.log(`✅ Attestation submitted!`);
  console.log(`  Transaction: ${tx}`);

  const record = await program.account.mintRecord.fetch(mintRecord).catch(() => null);
  if (!record) {
    console.log(`\n🎉 Threshold reached! MintRecord closed (rent refunded).`);
    return;
  }

  console.log(`\nMint Record:`);
  console.log(`  Attestations: ${record.attestations.length}`);
  console.log(`  Attested Power: ${record.attestedPower.toNumber()}`);
  const threshold = config.attestationThreshold.toNumber();
  const required = Math.ceil((registry.totalVotingPower.toNumber() * threshold) / 10000);
  console.log(`  Required Power: ${required} (${threshold / 100}% of ${registry.totalVotingPower.toNumber()})`);
  console.log(`  Remaining: ${required - record.attestedPower.toNumber()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
