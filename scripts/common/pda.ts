import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PROGRAM_ID } from "./config";

export function getBridgeConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bridge_config")],
    PROGRAM_ID
  );
}

export function getValidatorRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("validator_registry")],
    PROGRAM_ID
  );
}

export function getMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    PROGRAM_ID
  );
}

export function getBridgeStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bridge_state")],
    PROGRAM_ID
  );
}

export function getMintRecordPDA(burnTxHash: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_record"), burnTxHash],
    PROGRAM_ID
  );
}

export function getBurnRecordPDA(burnNonce: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("burn_record"), burnNonce.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export function getMetadataPDA(): [PublicKey, number] {
  const [mint] = getMintPDA();
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
}

export function logPDAs() {
  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [tokenMint] = getMintPDA();
  const [bridgeState] = getBridgeStatePDA();
  const [metadata] = getMetadataPDA();

  console.log("PDAs:");
  console.log(`  Bridge Config: ${bridgeConfig.toBase58()}`);
  console.log(`  Bridge State: ${bridgeState.toBase58()}`);
  console.log(`  Validator Registry: ${validatorRegistry.toBase58()}`);
  console.log(`  Token Mint: ${tokenMint.toBase58()}`);
  console.log(`  Token Metadata: ${metadata.toBase58()}`);
}
