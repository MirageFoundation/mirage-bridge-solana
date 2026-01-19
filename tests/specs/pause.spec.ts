import { describe, expect, it } from "bun:test";
import { Transaction } from "@solana/web3.js";
import { getTestContext } from "../utils/setup";
import { getBridgeConfigPDA, createFundedKeypair } from "../utils/helpers";
import { FailedTransactionMetadata } from "litesvm";

describe("3. Pause", () => {
  it("should pause the bridge", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();

    // First verify it's not paused
    const configBefore = await program.account.bridgeConfig.fetch(bridgeConfig);
    expect(configBefore.paused).toBe(false);

    const ix = await program.methods
      .pause()
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
      throw new Error(`Transaction failed: ${result.err().toString()}`);
    }

    expect(result).toBeDefined();
  });

  it("should have paused state after pause", async () => {
    const { program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const config = await program.account.bridgeConfig.fetch(bridgeConfig);

    expect(config.paused).toBe(true);
  });

  it("should fail when non-authority tries to pause", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const fakeAuthority = createFundedKeypair();

    const ix = await program.methods
      .pause()
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
  });
});
