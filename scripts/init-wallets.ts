import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { writeFileSync, readFileSync, existsSync, mkdirSync, symlinkSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import * as path from "path";

// Find project root by looking for Anchor.toml
function findProjectRoot(): string {
    let dir = process.cwd();
    while (dir !== "/") {
        if (existsSync(path.join(dir, "Anchor.toml"))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    throw new Error("Could not find project root (no Anchor.toml found)");
}

const PROJECT_ROOT = findProjectRoot();

// Usage:
//   bun run scripts/init-wallets.ts          # Generate new keypairs
//   bun run scripts/init-wallets.ts --force  # Overwrite existing

const args = process.argv.slice(2);
const forceOverwrite = args.includes("--force");

if (!process.env.HOME) {
    throw new Error("HOME environment variable is not set");
}
const CONFIG_DIR = path.join(process.env.HOME, ".config", "solana");
const AUTHORITY_PATH = path.join(CONFIG_DIR, "mirage-bridge-authority.json");
const PROGRAM_PATH = path.join(CONFIG_DIR, "mirage-bridge-program.json");

// Ensure config directory exists
if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadKeypair(filePath: string): Keypair {
    const secretKey = JSON.parse(readFileSync(filePath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function setupAnchorKeypair(programId: string) {
    const targetDeployDir = path.join(PROJECT_ROOT, "target/deploy");
    const anchorKeypairPath = path.join(targetDeployDir, "mirage_bridge-keypair.json");

    // Ensure target/deploy exists
    if (!existsSync(targetDeployDir)) {
        mkdirSync(targetDeployDir, { recursive: true });
    }

    // Remove existing file/symlink
    if (existsSync(anchorKeypairPath)) {
        unlinkSync(anchorKeypairPath);
    }

    // Create symlink from target/deploy to ~/.config/solana
    symlinkSync(PROGRAM_PATH, anchorKeypairPath);
    console.log(`  ✓ Symlinked keypair to target/deploy/`);

    // Update Anchor.toml with program ID
    const anchorTomlPath = path.join(PROJECT_ROOT, "Anchor.toml");
    let content = readFileSync(anchorTomlPath, "utf-8");
    content = content.replace(
        /mirage_bridge\s*=\s*"[^"]*"/g,
        `mirage_bridge = "${programId}"`
    );
    writeFileSync(anchorTomlPath, content);
    console.log(`  ✓ Updated Anchor.toml`);

    // Run anchor keys sync to update lib.rs
    execSync("anchor keys sync", { cwd: PROJECT_ROOT, stdio: "inherit" });
    console.log(`  ✓ Ran anchor keys sync`);
}

async function main() {
    console.log("=== Mirage Bridge Wallet Setup ===\n");

    // Check for existing files
    const authorityExists = existsSync(AUTHORITY_PATH);
    const programExists = existsSync(PROGRAM_PATH);

    if ((authorityExists || programExists) && !forceOverwrite) {
        console.log("Existing keypairs found:");
        if (authorityExists) console.log(`  ✓ ${AUTHORITY_PATH}`);
        if (programExists) console.log(`  ✓ ${PROGRAM_PATH}`);
        console.log("\nUse --force to overwrite.\n");

        // Still show the addresses
        if (authorityExists) {
            const authorityKeypair = loadKeypair(AUTHORITY_PATH);
            console.log("BRIDGE AUTHORITY:");
            console.log(`  Address: ${authorityKeypair.publicKey.toBase58()}`);
        }
        if (programExists) {
            const programKeypair = loadKeypair(PROGRAM_PATH);
            console.log("\nPROGRAM ID:");
            console.log(`  Address: ${programKeypair.publicKey.toBase58()}`);
        }
        return;
    }

    // === GENERATE NEW SEED ===
    const mnemonic = bip39.generateMnemonic(128); // 12 words

    console.log("─".repeat(50) + "\n");
    console.log("SEED PHRASE:\n");
    console.log(`  ${mnemonic}`);
    console.log("\n" + "─".repeat(50));
    console.log("⚠️  WRITE THIS DOWN AND STORE SECURELY!");
    console.log("⚠️  This is the ONLY time it will be displayed!");
    console.log("─".repeat(50) + "\n");

    // === AUTHORITY KEYPAIR (from seed, raw derivation) ===
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const authorityKeypair = Keypair.fromSeed(seed.slice(0, 32));

    // Phantom address for reference
    const phantomPath = "m/44'/501'/0'/0'";
    const phantomDerived = derivePath(phantomPath, seed.toString("hex"));
    const phantomKeypair = Keypair.fromSeed(phantomDerived.key);

    // === PROGRAM KEYPAIR (random) ===
    const programKeypair = Keypair.generate();

    // === SAVE KEYPAIRS ===
    writeFileSync(AUTHORITY_PATH, JSON.stringify(Array.from(authorityKeypair.secretKey)));
    writeFileSync(PROGRAM_PATH, JSON.stringify(Array.from(programKeypair.secretKey)));

    // === OUTPUT ===
    console.log("=== Keypairs Generated ===\n");

    console.log("BRIDGE AUTHORITY (raw derivation):");
    console.log(`  Address: ${authorityKeypair.publicKey.toBase58()}`);
    console.log(`  File:    ${AUTHORITY_PATH}`);
    console.log("  → Fund this address for bridge operations");

    console.log("\nPHANTOM WALLET (BIP44 - same seed, different address):");
    console.log(`  Address: ${phantomKeypair.publicKey.toBase58()}`);
    console.log("  → This is what Phantom/Solflare display");

    console.log("\nPROGRAM ID:");
    console.log(`  Address: ${programKeypair.publicKey.toBase58()}`);
    console.log(`  File:    ${PROGRAM_PATH}`);

    // Setup Anchor symlink and sync
    console.log("\n" + "─".repeat(50));
    console.log("Setting up Anchor...");
    setupAnchorKeypair(programKeypair.publicKey.toBase58());
    console.log("─".repeat(50));
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
