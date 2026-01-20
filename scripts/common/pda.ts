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

export function logPDAs() {
  const [bridgeConfig] = getBridgeConfigPDA();
  const [validatorRegistry] = getValidatorRegistryPDA();
  const [tokenMint] = getMintPDA();
  const [bridgeState] = getBridgeStatePDA();

  console.log("PDAs:");
  console.log(`  Bridge Config: ${bridgeConfig.toBase58()}`);
  console.log(`  Bridge State: ${bridgeState.toBase58()}`);
  console.log(`  Validator Registry: ${validatorRegistry.toBase58()}`);
  console.log(`  Token Mint: ${tokenMint.toBase58()}`);
}
