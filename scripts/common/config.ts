import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { MirageBridge } from "../../target/types/mirage_bridge";
import IDL from "../../target/idl/mirage_bridge.json";

export type Network = "localnet" | "devnet" | "mainnet";

export const PROGRAM_ID = new PublicKey("8uTqBhqHt8BCJNdS7aDX7vUXHmABevhqwyQsAoxv4jx9");

export const RPC_URLS: Record<Network, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: clusterApiUrl("devnet"),
  mainnet: clusterApiUrl("mainnet-beta"),
};

export function getNetwork(): Network {
  const net = process.env.NETWORK || "localnet";
  if (net !== "localnet" && net !== "devnet" && net !== "mainnet") {
    throw new Error(`Invalid network: ${net}. Use localnet, devnet, or mainnet`);
  }
  return net;
}

export function loadKeypair(path: string): Keypair {
  const secretKey = JSON.parse(readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function getWalletPath(): string {
  return process.env.WALLET || "./test-wallet.json";
}

export function getConnection(network: Network): Connection {
  const rpcUrl = process.env.RPC_URL || RPC_URLS[network];
  return new Connection(rpcUrl, "confirmed");
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
  const wallet = loadKeypair(getWalletPath());
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
