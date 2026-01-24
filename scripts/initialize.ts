import { SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getBridgeStatePDA, getValidatorRegistryPDA, getMintPDA, getMetadataPDA, METADATA_PROGRAM_ID, logPDAs } from "./common/pda";
import { confirmTx } from "./common/utils";

async function main() {
  console.log("=== Initialize Bridge ===\n");
  
  const { connection, wallet, program } = setupFromEnv();
  logPDAs();
  console.log("---");

  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [bridgeState] = getBridgeStatePDA();
  const [tokenMint] = getMintPDA();
  const [metadata] = getMetadataPDA();

  const existingConfig = await connection.getAccountInfo(bridgeConfig);
  if (existingConfig) {
    console.log("❌ Bridge already initialized!");
    const config = await program.account.bridgeConfig.fetch(bridgeConfig);
    console.log(`  Authority: ${config.authority.toBase58()}`);
    console.log(`  Mint: ${config.mint.toBase58()}`);
    console.log(`  Chain ID: ${config.mirageChainId}`);
    console.log(`  Threshold: ${config.attestationThreshold.toNumber()} basis points`);
    console.log(`  Paused: ${config.paused}`);
    process.exit(1);
  }

  const mirageChainId = process.env.CHAIN_ID || "mirage-1";
  const attestationThreshold = new BN(process.env.THRESHOLD || "6667");
  const tokenName = process.env.TOKEN_NAME || "MIRAGE";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "MIRAGE";
  const tokenUri = process.env.TOKEN_URI || "https://mirage.talk/metadata/solana/token.json";

  console.log(`Initializing with:`);
  console.log(`  Chain ID: ${mirageChainId}`);
  console.log(`  Threshold: ${attestationThreshold.toNumber()} basis points (${attestationThreshold.toNumber() / 100}%)`);
  console.log(`  Authority: ${wallet.publicKey.toBase58()}`);
  console.log(`  Token Name: ${tokenName}`);
  console.log(`  Token Symbol: ${tokenSymbol}`);
  console.log(`  Token URI: ${tokenUri}`);
  console.log("");

  const tx = await program.methods
    .initialize({
      mirageChainId,
      attestationThreshold,
      tokenName,
      tokenSymbol,
      tokenUri,
    })
    .accounts({
      authority: wallet.publicKey,
      bridgeConfig,
      bridgeState,
      validatorRegistry,
      tokenMint,
      metadata,
      tokenMetadataProgram: METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([wallet])
    .rpc();

  await confirmTx(connection, tx);

  console.log(`✅ Bridge initialized!`);
  console.log(`  Transaction: ${tx}`);

  const config = await program.account.bridgeConfig.fetch(bridgeConfig);
  console.log(`\nBridge Config:`);
  console.log(`  Authority: ${config.authority.toBase58()}`);
  console.log(`  Mint: ${config.mint.toBase58()}`);
  console.log(`  Chain ID: ${config.mirageChainId}`);
  console.log(`  Threshold: ${config.attestationThreshold.toNumber()} basis points`);
  console.log(`  Paused: ${config.paused}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
