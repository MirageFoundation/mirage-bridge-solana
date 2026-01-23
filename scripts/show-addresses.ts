import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import { writeFileSync } from "fs";

// Usage: 
//   bun run scripts/show-addresses.ts "your seed phrase here"
//   bun run scripts/show-addresses.ts "your seed phrase here" --export wallet.json

const args = process.argv.slice(2);
const exportFlag = args.indexOf("--export");
const exportPath = exportFlag !== -1 ? args[exportFlag + 1] : null;
const mnemonic = args.find(arg => !arg.startsWith("--") && arg !== exportPath);

if (!mnemonic) {
  console.log("Usage:");
  console.log("  bun run scripts/show-addresses.ts \"your seed phrase here\"");
  console.log("  bun run scripts/show-addresses.ts \"your seed phrase here\" --export wallet.json");
  process.exit(1);
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

console.log("PHANTOM WALLET (BIP44 m/44'/501'/0'/0'):");
console.log(`  Address: ${phantomKeypair.publicKey.toBase58()}`);
console.log("  → This is what Phantom/Solflare display");
console.log("  → Use for manual token transfers");
console.log("  → NOT the same as bridge authority!");
console.log();

console.log("─".repeat(50));
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
