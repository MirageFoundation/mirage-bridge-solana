import { describe, expect, it } from "bun:test";
import { Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getTestContext } from "../utils/setup";
import { getBridgeConfigPDA, getValidatorRegistryPDA, getMintPDA, getMetadataPDA, METADATA_PROGRAM_ID } from "../utils/helpers";
import BN from "bn.js";
import { FailedTransactionMetadata } from "litesvm";

describe("1. Initialize", () => {
  it("should initialize the bridge with valid params", async () => {
    const { svm, program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [validatorRegistry] = getValidatorRegistryPDA();
    const [tokenMint] = getMintPDA();
    const [metadata] = getMetadataPDA();

    const mirageChainId = "mirage-1";
    const attestationThreshold = new BN(6667);
    const tokenName = "MIRAGE";
    const tokenSymbol = "MIRAGE";
    const tokenUri = "https://mirage.talk/metadata/solana/token.json";

    const ix = await program.methods
      .initialize({
        mirageChainId,
        attestationThreshold,
        tokenName,
        tokenSymbol,
        tokenUri,
      })
      .accounts({
        authority: authority.publicKey,
        bridgeConfig,
        validatorRegistry,
        tokenMint,
        metadata,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
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

    // Verify accounts were created
    const configAccount = svm.getAccount(bridgeConfig);
    expect(configAccount).not.toBeNull();

    const registryAccount = svm.getAccount(validatorRegistry);
    expect(registryAccount).not.toBeNull();

    const mintAccount = svm.getAccount(tokenMint);
    expect(mintAccount).not.toBeNull();

    // Verify metadata account was created
    const metadataAccount = svm.getAccount(metadata);
    expect(metadataAccount).not.toBeNull();
  });

  it("should have correct bridge config state after initialization", async () => {
    const { program, authority } = getTestContext();

    const [bridgeConfig] = getBridgeConfigPDA();
    const [tokenMint] = getMintPDA();

    const config = await program.account.bridgeConfig.fetch(bridgeConfig);

    expect(config.authority.toBase58()).toBe(authority.publicKey.toBase58());
    expect(config.mint.toBase58()).toBe(tokenMint.toBase58());
    expect(config.mirageChainId).toBe("mirage-1");
    expect(config.attestationThreshold.toNumber()).toBe(6667);
    expect(config.totalMinted.toNumber()).toBe(0);
    expect(config.totalBurned.toNumber()).toBe(0);
    expect(config.burnNonce.toNumber()).toBe(0);
    expect(config.paused).toBe(false);
  });

  it("should have empty validator registry after initialization", async () => {
    const { program } = getTestContext();

    const [validatorRegistry] = getValidatorRegistryPDA();
    const registry = await program.account.validatorRegistry.fetch(validatorRegistry);

    expect(registry.validators.length).toBe(0);
    expect(registry.totalStake.toNumber()).toBe(0);
  });
});
