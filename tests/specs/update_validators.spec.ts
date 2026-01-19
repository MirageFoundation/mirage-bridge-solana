import { describe, expect, it } from "bun:test";
import { Transaction, Keypair } from "@solana/web3.js";
import { getTestContext } from "../utils/setup";
import { getBridgeConfigPDA, getValidatorRegistryPDA, createFundedKeypair } from "../utils/helpers";
import BN from "bn.js";
import { FailedTransactionMetadata } from "litesvm";

describe("2. Update Validators", () => {
  it("should update validators with a single validator", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [validatorRegistry] = getValidatorRegistryPDA();

    const orchestrator1 = Keypair.generate();

    const validators = [
      {
        orchestratorPubkey: orchestrator1.publicKey,
        mirageValidator: "miragevaloper1abc123def456",
        votingPower: new BN(1000),
      },
    ];

    const ix = await program.methods
      .updateValidators({ validators })
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
        validatorRegistry,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(authority);

    const result = svm.sendTransaction(tx);

    if (result instanceof FailedTransactionMetadata) {
      console.log("Transaction failed:", result.err().toString());
      throw new Error(`Transaction failed: ${result.err().toString()}`);
    }

    expect(result).toBeDefined();
  });

  it("should have correct validator registry state", async () => {
    const { program } = getTestContext();

    const [validatorRegistry] = getValidatorRegistryPDA();
    const registry = await program.account.validatorRegistry.fetch(validatorRegistry);

    expect(registry.validators.length).toBe(1);
    expect(registry.totalVotingPower.toNumber()).toBe(1000);
    expect(registry.validators[0].votingPower.toNumber()).toBe(1000);
    expect(registry.validators[0].mirageValidator).toBe("miragevaloper1abc123def456");
  });

  it("should update validators with multiple validators", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [validatorRegistry] = getValidatorRegistryPDA();

    const orchestrator1 = Keypair.generate();
    const orchestrator2 = Keypair.generate();
    const orchestrator3 = Keypair.generate();

    const validators = [
      {
        orchestratorPubkey: orchestrator1.publicKey,
        mirageValidator: "miragevaloper1validator1",
        votingPower: new BN(3000),
      },
      {
        orchestratorPubkey: orchestrator2.publicKey,
        mirageValidator: "miragevaloper1validator2",
        votingPower: new BN(2000),
      },
      {
        orchestratorPubkey: orchestrator3.publicKey,
        mirageValidator: "miragevaloper1validator3",
        votingPower: new BN(1000),
      },
    ];

    const ix = await program.methods
      .updateValidators({ validators })
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
        validatorRegistry,
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

    const registry = await program.account.validatorRegistry.fetch(validatorRegistry);
    expect(registry.validators.length).toBe(3);
    expect(registry.totalVotingPower.toNumber()).toBe(6000);
  });

  it("should fail when non-authority tries to update validators", async () => {
    const { svm, program } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [validatorRegistry] = getValidatorRegistryPDA();

    const fakeAuthority = createFundedKeypair();
    const orchestrator = Keypair.generate();

    const validators = [
      {
        orchestratorPubkey: orchestrator.publicKey,
        mirageValidator: "miragevaloper1fake",
        votingPower: new BN(1000),
      },
    ];

    const ix = await program.methods
      .updateValidators({ validators })
      .accounts({
        authority: fakeAuthority.publicKey,
        bridgeConfig,
        validatorRegistry,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(fakeAuthority);

    const result = svm.sendTransaction(tx);
    expect(result instanceof FailedTransactionMetadata).toBe(true);
  });

  it("should fail with empty validator set", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [validatorRegistry] = getValidatorRegistryPDA();

    const ix = await program.methods
      .updateValidators({ validators: [] })
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
        validatorRegistry,
      })
      .instruction();

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(authority);

    const result = svm.sendTransaction(tx);
    expect(result instanceof FailedTransactionMetadata).toBe(true);
  });
});
