import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { writeFileSync } from "fs";
import * as readline from "readline";

// Usage: 
//   bun run scripts/show-addresses.ts
//   bun run scripts/show-addresses.ts --export wallet.json
//   bun run scripts/show-addresses.ts --generate
//   bun run scripts/show-addresses.ts --generate --export wallet.json

const args = process.argv.slice(2);
const exportFlag = args.indexOf("--export");
const exportPath = exportFlag !== -1 ? args[exportFlag + 1] : null;
const generateNew = args.includes("--generate");

async function promptForSeed(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter seed phrase: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

let mnemonic: string;

if (generateNew) {
  mnemonic = bip39.generateMnemonic(128); // 12 words
  console.log("=== NEW SEED PHRASE (SAVE THIS SECURELY!) ===\n");
  console.log(mnemonic);
  console.log("\n" + "─".repeat(50));
  console.log("⚠️  WRITE THIS DOWN AND STORE SECURELY!");
  console.log("⚠️  This is the ONLY time it will be displayed!");
  console.log("─".repeat(50) + "\n");
} else {
  console.log("Seed phrase will NOT appear in shell history.\n");
  mnemonic = await promptForSeed();
}

const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, " ");

if (!bip39.validateMnemonic(normalizedMnemonic)) {
  console.log("❌ Invalid seed phrase");
  process.exit(1);
}

const seed = bip39.mnemonicToSeedSync(normalizedMnemonic);

// Derive both addresses
const phantomPath = "m/44'/501'/0'/0'";
const phantomDerived = derivePath(phantomPath, seed.toString("hex"));
const phantomKeypair = Keypair.fromSeed(phantomDerived.key);
const rawKeypair = Keypair.fromSeed(seed.slice(0, 32));

console.log("=== Solana Addresses from Seed ===\n");

console.log("BRIDGE AUTHORITY (raw derivation):");
console.log(`  Address: ${rawKeypair.publicKey.toBase58()}`);
console.log("  → Use this as your bridge authority");
console.log("  → This is what solana-keygen generates");
console.log("  → Fund this address for bridge operations");
console.log();

console.log("\nPHANTOM WALLET (BIP44 m/44'/501'/0'/0'):");
console.log(`  Address: ${phantomKeypair.publicKey.toBase58()}`);
console.log("  → This is what Phantom/Solflare display");
console.log("  → Use for manual token transfers");
console.log("  → NOT the same as bridge authority!");
console.log();

console.log("\n" + "─".repeat(50));
console.log("IMPORTANT: Same seed phrase, DIFFERENT addresses.");
console.log("The bridge uses raw derivation. Phantom uses BIP44.");
console.log("To fund your bridge authority, send SOL to the first address.");
console.log("─".repeat(50));

if (exportPath) {
  const secretKeyArray = Array.from(rawKeypair.secretKey);
  writeFileSync(exportPath, JSON.stringify(secretKeyArray));
  console.log(`\n✅ Exported bridge authority keypair to: ${exportPath}`);
  console.log("   (raw derivation, compatible with solana CLI)");
}
