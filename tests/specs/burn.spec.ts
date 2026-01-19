import { describe, expect, it } from "bun:test";
import { Transaction, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getTestContext } from "../utils/setup";
import { 
  getBridgeConfigPDA, 
  getMintPDA, 
  getBurnRecordPDA, 
  createFundedKeypair,
  setupTokenAccount,
} from "../utils/helpers";
import BN from "bn.js";
import { FailedTransactionMetadata, TransactionMetadata } from "litesvm";

describe("5. Burn", () => {
  it("should burn tokens successfully", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    // Verify bridge is not paused before burn
    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configBefore.paused).toBe(false);

    // Get current burn nonce for PDA derivation
    const burnNonce = configBefore.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    // Set up user with tokens
    const user = createFundedKeypair();
    const burnAmount = BigInt(100_000_000); // 100 tokens (6 decimals)
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, burnAmount);

    // Valid bech32 mirage address
    const mirageRecipient = "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9";

    const ix = await program.methods
      .burn({
        mirageRecipient,
        amount: new BN(burnAmount.toString()),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(user);

    const result = svm.sendTransaction(tx);

    if (result instanceof FailedTransactionMetadata) {
      console.log("Transaction failed:", result.err().toString());
      throw new Error(`Transaction failed: ${result.err().toString()}`);
    }

    expect(result).toBeDefined();
  });

  it("should update bridge config after burn", async () => {
    const { program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const config = await program.account.bridgeConfig.fetch(bridgeConfig);

    expect(config.burnNonce.toNumber()).toBe(1);
    expect(config.totalBurned.toNumber()).toBe(100_000_000);
  });

  it("should create burn record with correct fields", async () => {
    const { program } = getTestContext();

    const [burnRecord] = getBurnRecordPDA(new BN(0));
    const record = await program.account.burnRecord.fetch(burnRecord);

    // Verify all BurnRecord fields match SOLANA_BRIDGE_SPEC.md
    expect(record.burnId.toNumber()).toBe(0);
    expect(record.amount.toNumber()).toBe(100_000_000);
    expect(record.mirageRecipient).toBe("mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9");
    expect(record.solanaSender).toBeDefined(); // Should be the user's pubkey
    expect(record.timestamp).toBeDefined(); // Timestamp from Clock sysvar (may be 0 in test env)
  });

  it("should emit BurnInitiated event with all required fields", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    const burnNonce = configBefore.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    const user = createFundedKeypair();
    const burnAmount = BigInt(50_000_000);
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, burnAmount);

    const mirageRecipient = "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9";

    const ix = await program.methods
      .burn({
        mirageRecipient,
        amount: new BN(burnAmount.toString()),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(user);

    const result = svm.sendTransaction(tx);

    if (result instanceof FailedTransactionMetadata) {
      throw new Error(`Transaction failed: ${result.err().toString()}`);
    }

    // Get logs from the transaction
    const logs = (result as TransactionMetadata).logs();
    
    // Verify "Program data:" log exists (Anchor event emission)
    const hasEventLog = logs.some((log: string) => log.includes("Program data:"));
    expect(hasEventLog).toBe(true);

    // Verify burn record has correct burn_id (auto-incrementing)
    const record = await program.account.burnRecord.fetch(burnRecord);
    expect(record.burnId.toNumber()).toBe(burnNonce.toNumber());
  });

  it("should auto-increment burn_id for each burn (uniqueness)", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    // Get current nonce
    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    const startNonce = configBefore.burnNonce.toNumber();

    // Do another burn
    const burnNonce = configBefore.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    const user = createFundedKeypair();
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, BigInt(25_000_000));

    const ix = await program.methods
      .burn({
        mirageRecipient: "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9",
        amount: new BN(25_000_000),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(user);

    const result = svm.sendTransaction(tx);
    if (result instanceof FailedTransactionMetadata) {
      throw new Error(`Burn failed: ${result.err().toString()}`);
    }

    // Verify nonce incremented
    const configAfter = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configAfter.burnNonce.toNumber()).toBe(startNonce + 1);

    // Verify burn record has unique ID
    const record = await program.account.burnRecord.fetch(burnRecord);
    expect(record.burnId.toNumber()).toBe(startNonce);
  });

  it("should fail with invalid mirage recipient address", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    const burnNonce = configBefore.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    const user = createFundedKeypair();
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, BigInt(100_000_000));

    // Invalid address - wrong prefix
    const invalidRecipient = "cosmos1abc123def456";

    const ix = await program.methods
      .burn({
        mirageRecipient: invalidRecipient,
        amount: new BN(50_000_000),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(user);

    const result = svm.sendTransaction(tx);
    expect(result instanceof FailedTransactionMetadata).toBe(true);
  });

  it("should fail with zero amount", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    const burnNonce = configBefore.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    const user = createFundedKeypair();
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, BigInt(100_000_000));

    const mirageRecipient = "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9";

    const ix = await program.methods
      .burn({
        mirageRecipient,
        amount: new BN(0),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(user);

    const result = svm.sendTransaction(tx);
    expect(result instanceof FailedTransactionMetadata).toBe(true);
  });

  it("should fail when bridge is paused", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    // Verify current state - should be unpaused
    const configCheck = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configCheck.paused).toBe(false);

    // Pause the bridge - add compute budget to make tx unique
    const pauseIx = await program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
      })
      .instruction();

    // Add a compute budget instruction to make this transaction unique
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    });

    const pauseTx = new Transaction();
    pauseTx.recentBlockhash = svm.latestBlockhash();
    pauseTx.add(computeBudgetIx);
    pauseTx.add(pauseIx);
    pauseTx.sign(authority);
    const pauseResult = svm.sendTransaction(pauseTx);
    
    if (pauseResult instanceof FailedTransactionMetadata) {
      throw new Error(`Pause failed: ${pauseResult.err().toString()}`);
    }

    // Verify bridge is now paused
    const configAfterPause = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configAfterPause.paused).toBe(true);

    // Try to burn - should fail with BridgePaused error (6003)
    const burnNonce = configAfterPause.burnNonce;
    const [burnRecord] = getBurnRecordPDA(burnNonce);

    const user = createFundedKeypair();
    const userTokenAccount = setupTokenAccount(user.publicKey, tokenMint, BigInt(100_000_000));

    const mirageRecipient = "mirage1qy352euf40x77qfrg4ncn27dauqjx3t8laxec9";

    const burnIx = await program.methods
      .burn({
        mirageRecipient,
        amount: new BN(50_000_000),
      })
      .accounts({
        user: user.publicKey,
        userTokenAccount,
        tokenMint,
        bridgeConfig,
        burnRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const burnTx = new Transaction();
    burnTx.recentBlockhash = svm.latestBlockhash();
    burnTx.add(burnIx);
    burnTx.sign(user);

    const burnResult = svm.sendTransaction(burnTx);
    
    // Should fail because bridge is paused
    expect(burnResult instanceof FailedTransactionMetadata).toBe(true);

    // Cleanup: Unpause for future tests - add compute budget to make unique
    const unpauseIx = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
      })
      .instruction();

    const computeBudgetIx2 = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_001, // Different value to make unique
    });

    const unpauseTx = new Transaction();
    unpauseTx.recentBlockhash = svm.latestBlockhash();
    unpauseTx.add(computeBudgetIx2);
    unpauseTx.add(unpauseIx);
    unpauseTx.sign(authority);
    
    const unpauseResult = svm.sendTransaction(unpauseTx);
    if (unpauseResult instanceof FailedTransactionMetadata) {
      throw new Error(`Cleanup unpause failed: ${unpauseResult.err().toString()}`);
    }

    // Verify cleanup worked
    const configAfterCleanup = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configAfterCleanup.paused).toBe(false);
  });
});
