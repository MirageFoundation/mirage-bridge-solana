import { SystemProgram } from "@solana/web3.js";
import { setupFromEnv } from "./common/config";
import { getBridgeConfigPDA, getMintPDA, getMetadataPDA, METADATA_PROGRAM_ID, logPDAs } from "./common/pda";
import { confirmTx } from "./common/utils";

async function main() {
    console.log("=== Create Token Metadata ===\n");

    const { connection, wallet, program } = setupFromEnv();
    logPDAs();
    console.log("---");

    const [bridgeConfig] = getBridgeConfigPDA();
    const [mint] = getMintPDA();
    const [metadata] = getMetadataPDA();

    // Check if bridge is initialized
    const existingConfig = await connection.getAccountInfo(bridgeConfig);
    if (!existingConfig) {
        console.log("❌ Bridge not initialized!");
        process.exit(1);
    }

    // Check if metadata already exists
    const existingMetadata = await connection.getAccountInfo(metadata);
    if (existingMetadata) {
        console.log("❌ Metadata already exists!");
        console.log(`  Metadata: ${metadata.toBase58()}`);
        process.exit(1);
    }

    const config = await program.account.bridgeConfig.fetch(bridgeConfig);

    // Verify authority
    if (!config.authority.equals(wallet.publicKey)) {
        console.log("❌ You are not the bridge authority!");
        console.log(`  Current authority: ${config.authority.toBase58()}`);
        console.log(`  Your wallet: ${wallet.publicKey.toBase58()}`);
        process.exit(1);
    }

    const tokenName = process.env.TOKEN_NAME || "MIRAGE";
    const tokenSymbol = process.env.TOKEN_SYMBOL || "MIRAGE";
    const tokenUri = process.env.TOKEN_URI || "https://mirage.talk/metadata/solana/token.json";

    console.log(`Creating metadata with:`);
    console.log(`  Token Name: ${tokenName}`);
    console.log(`  Token Symbol: ${tokenSymbol}`);
    console.log(`  Token URI: ${tokenUri}`);
    console.log(`  Mint: ${mint.toBase58()}`);
    console.log(`  Metadata PDA: ${metadata.toBase58()}`);
    console.log("");

    const tx = await program.methods
        .createMetadata({
            tokenName,
            tokenSymbol,
            tokenUri,
        })
        .accounts({
            authority: wallet.publicKey,
            bridgeConfig,
            mint,
            metadata,
            tokenMetadataProgram: METADATA_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc();

    await confirmTx(connection, tx);

    console.log(`✅ Token metadata created!`);
    console.log(`  Transaction: ${tx}`);
    console.log(`  Metadata: ${metadata.toBase58()}`);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
