import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import * as path from "path";
import { MirageBridge } from "../../target/types/mirage_bridge";
import IDL from "../../target/idl/mirage_bridge.json";

export type Network = "localnet" | "devnet" | "mainnet";

if (!process.env.HOME) {
  throw new Error("HOME environment variable is not set");
}
const PROGRAM_KEYPAIR_PATH = path.join(process.env.HOME, ".config", "solana", "mirage-bridge-program.json");

function getProgramId(): PublicKey {
    if (!existsSync(PROGRAM_KEYPAIR_PATH)) {
        throw new Error(
            `Program keypair not found at: ${PROGRAM_KEYPAIR_PATH}\n` +
            "Run: bun run scripts/init-wallets.ts"
        );
    }
    const secretKey = JSON.parse(readFileSync(PROGRAM_KEYPAIR_PATH, "utf-8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    return keypair.publicKey;
}

export const PROGRAM_ID = getProgramId();

export const RPC_URLS: Record<Network, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: clusterApiUrl("devnet"),
  mainnet: clusterApiUrl("mainnet-beta"),
};

function getSolanaConfig(): { rpcUrl: string; keypairPath: string } {
  try {
    const output = execSync("solana config get", { encoding: "utf-8" });
    const rpcMatch = output.match(/RPC URL:\s*(\S+)/);
    const keypairMatch = output.match(/Keypair Path:\s*(\S+)/);
    return {
      rpcUrl: rpcMatch?.[1] || "",
      keypairPath: keypairMatch?.[1] || "",
    };
  } catch {
    return { rpcUrl: "", keypairPath: "" };
  }
}

function networkFromRpcUrl(rpcUrl: string): Network {
  if (rpcUrl.includes("devnet")) return "devnet";
  if (rpcUrl.includes("mainnet")) return "mainnet";
  return "localnet";
}

export function getNetwork(): Network {
  if (process.env.NETWORK) {
    const net = process.env.NETWORK;
    if (net !== "localnet" && net !== "devnet" && net !== "mainnet") {
      throw new Error(`Invalid network: ${net}. Use localnet, devnet, or mainnet`);
    }
    return net;
  }
  const { rpcUrl } = getSolanaConfig();
  return networkFromRpcUrl(rpcUrl);
}

const AUTHORITY_PATH = path.join(process.env.HOME, ".config", "solana", "mirage-bridge-authority.json");

export function loadKeypair(filePath: string): Keypair {
  const secretKey = JSON.parse(readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Get wallet keypair path - always ~/.config/solana/mirage-bridge-authority.json
 */
export function getWalletPath(): string {
  if (!existsSync(AUTHORITY_PATH)) {
    throw new Error(
      `Authority keypair not found at: ${AUTHORITY_PATH}\n` +
      "Run: bun run scripts/init-wallets.ts"
    );
  }
  return AUTHORITY_PATH;
}

export function getConnection(network: Network): Connection {
  if (process.env.RPC_URL) {
    return new Connection(process.env.RPC_URL, "confirmed");
  }
  const { rpcUrl } = getSolanaConfig();
  if (rpcUrl) {
    return new Connection(rpcUrl, "confirmed");
  }
  return new Connection(RPC_URLS[network], "confirmed");
}

export function getProvider(connection: Connection, wallet: Keypair): AnchorProvider {
  const anchorWallet = new Wallet(wallet);
  return new AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

export function getProgram(provider: AnchorProvider): Program<MirageBridge> {
  return new Program(IDL as MirageBridge, provider);
}

export function setupFromEnv(): {
  network: Network;
  connection: Connection;
  wallet: Keypair;
  provider: AnchorProvider;
  program: Program<MirageBridge>;
} {
  const network = getNetwork();
  const walletPath = getWalletPath();
  const wallet = loadKeypair(walletPath);
  const connection = getConnection(network);
  const provider = getProvider(connection, wallet);
  const program = getProgram(provider);

  console.log(`Network: ${network}`);
  console.log(`RPC: ${connection.rpcEndpoint}`);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log("---");

  return { network, connection, wallet, provider, program };
}
