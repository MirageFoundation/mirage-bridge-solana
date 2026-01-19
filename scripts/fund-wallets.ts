import { LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readdirSync, existsSync } from "fs";
import { setupFromEnv, loadKeypair, getWalletPath } from "./common/config";
import { confirmTx } from "./common/utils";

const WALLETS_DIR = "./scripts/wallets";

async function main() {
  console.log("=== Fund Test Wallets ===\n");
  
  const { connection, network, wallet } = setupFromEnv();
  
  const useTransfer = process.env.USE_TRANSFER === "true" || network === "devnet" || network === "mainnet";
  const amountSol = parseFloat(process.env.AMOUNT || "0.5");
  const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  if (useTransfer) {
    console.log(`Mode: Transfer from authority wallet`);
    const authorityBalance = await connection.getBalance(wallet.publicKey);
    console.log(`Authority balance: ${authorityBalance / LAMPORTS_PER_SOL} SOL\n`);
    
    if (authorityBalance < amountLamports * 2) {
      console.log("❌ Authority wallet has insufficient funds!");
      console.log(`   Need at least ${amountSol * 2} SOL to fund other wallets.`);
      if (network === "localnet") {
        console.log("   Run: solana airdrop 5 --url localhost");
      }
      process.exit(1);
    }
  } else {
    console.log(`Mode: Airdrop (localnet)\n`);
  }

  if (!existsSync(WALLETS_DIR)) {
    console.log("❌ Wallets directory not found!");
    console.log("   Run: bun run bridge:generate-wallets");
    process.exit(1);
  }

  const files = readdirSync(WALLETS_DIR).filter(f => f.endsWith(".json") && f !== "validators.json");
  
  console.log(`Funding ${files.length} wallets with ${amountSol} SOL each...\n`);

  for (const file of files) {
    const path = `${WALLETS_DIR}/${file}`;
    const keypair = loadKeypair(path);
    
    try {
      const currentBalance = await connection.getBalance(keypair.publicKey);
      
      if (currentBalance >= amountLamports) {
        console.log(`✓ ${file}: Already has ${(currentBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
        continue;
      }

      const needed = amountLamports - currentBalance;

      if (useTransfer) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: keypair.publicKey,
            lamports: needed,
          })
        );
        
        const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`✓ ${file}: ${keypair.publicKey.toBase58().slice(0, 8)}... → ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (transferred)`);
      } else {
        const sig = await connection.requestAirdrop(keypair.publicKey, needed);
        await confirmTx(connection, sig);
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log(`✓ ${file}: ${keypair.publicKey.toBase58().slice(0, 8)}... → ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (airdrop)`);
      }
    } catch (err: any) {
      console.log(`✗ ${file}: Failed - ${err.message}`);
    }
  }

  console.log(`\n✅ Funding complete!`);
  
  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`Authority remaining: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
