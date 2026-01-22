import { PublicKey, TransactionSignature, Connection } from "@solana/web3.js";
import BN from "bn.js";

export async function confirmTx(
  connection: Connection,
  signature: TransactionSignature
): Promise<void> {
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
}

export function formatAmount(amount: BN | number | bigint, decimals: number = 6): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  return (value / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseAmount(amount: string, decimals: number = 6): BN {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return new BN(Math.floor(parsed * Math.pow(10, decimals)));
}

export function shortPubkey(pubkey: PublicKey | string): string {
  const str = typeof pubkey === "string" ? pubkey : pubkey.toBase58();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export function buildAttestationPayload(
  burnTxHash: Buffer,
  mirageSender: string,
  amount: BN,
  recipient: PublicKey,
  destinationChain: string = "solana"
): Buffer {
  const senderLen = Buffer.alloc(4);
  senderLen.writeUInt32LE(mirageSender.length, 0);
  
  const amountBuf = amount.toArrayLike(Buffer, "le", 8);

  const chainLen = Buffer.alloc(4);
  chainLen.writeUInt32LE(destinationChain.length, 0);
  
  return Buffer.concat([
    burnTxHash,
    senderLen,
    Buffer.from(mirageSender),
    amountBuf,
    recipient.toBuffer(),
    chainLen,
    Buffer.from(destinationChain),
  ]);
}

export function hexToBuffer(hex: string): Buffer {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  return Buffer.from(hex, "hex");
}

export function bufferToHex(buffer: Buffer): string {
  return buffer.toString("hex");
}
