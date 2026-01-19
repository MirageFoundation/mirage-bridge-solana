import { describe, expect, it } from "bun:test";
import { Transaction } from "@solana/web3.js";
import { getTestContext } from "../utils/setup";
import { getBridgeConfigPDA, createFundedKeypair } from "../utils/helpers";
import { FailedTransactionMetadata } from "litesvm";

describe("4. Unpause", () => {
  // IMPORTANT: Test order matters! This test runs FIRST while bridge is still paused from pause.spec
  it("should fail when non-authority tries to unpause", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();

    // Verify bridge is still paused from pause.spec
    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configBefore.paused).toBe(true);

    // Try to unpause with fake authority - should fail
    const fakeAuthority = createFundedKeypair();

    const ix = await program.methods
      .unpause()
      .accounts({
        authority: fakeAuthority.publicKey,
        bridgeConfig,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(fakeAuthority);

    const result = svm.sendTransaction(tx);
    expect(result instanceof FailedTransactionMetadata).toBe(true);

    // Verify still paused (unauthorized unpause should have failed)
    const configAfter = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configAfter.paused).toBe(true);
  });

  it("should unpause the bridge", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();

    // Verify it's still paused
    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configBefore.paused).toBe(true);

    const ix = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(authority);

    const result = svm.sendTransaction(tx);

    if (result instanceof FailedTransactionMetadata) {
      throw new Error(`Unpause failed: ${result.err().toString()}`);
    }

    expect(result).toBeDefined();
  });

  it("should have unpaused state after unpause", async () => {
    const { program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const config = await program.account.bridgeConfig.fetch(bridgeConfig);

    expect(config.paused).toBe(false);
  });
});
