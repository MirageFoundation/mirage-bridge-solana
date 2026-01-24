import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getTestContext } from "./setup";
import { ACCOUNT_SIZE, AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, MintLayout, MINT_SIZE } from "@solana/spl-token";
import BN from "bn.js";

export function getProgramId(): PublicKey {
  const { program } = getTestContext();
  return program.programId;
}

export function getBridgeConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bridge_config")],
    getProgramId()
  );
}

export function getValidatorRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("validator_registry")],
    getProgramId()
  );
}

export function getMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    getProgramId()
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

export function getMintRecordPDA(burnTxHash: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_record"), burnTxHash],
    getProgramId()
  );
}

export function getBurnRecordPDA(burnNonce: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("burn_record"), burnNonce.toArrayLike(Buffer, "le", 8)],
    getProgramId()
  );
}

export function fundAccount(pubkey: PublicKey, lamports: number = 10 * LAMPORTS_PER_SOL) {
  const { svm } = getTestContext();
  svm.airdrop(pubkey, BigInt(lamports));
}

export function createFundedKeypair(): Keypair {
  const keypair = Keypair.generate();
  fundAccount(keypair.publicKey);
  return keypair;
}

export function generateBurnTxHash(): Buffer {
  return Buffer.from(Keypair.generate().publicKey.toBytes());
}

export function updateMintSupply(mint: PublicKey, newSupply: bigint) {
  const { svm } = getTestContext();
  
  const existingAccount = svm.getAccount(mint);
  if (!existingAccount) {
    throw new Error("Mint account not found");
  }
  
  const mintData = Buffer.from(existingAccount.data);
  const decoded = MintLayout.decode(mintData);
  
  // Re-encode with updated supply
  const newMintData = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: decoded.mintAuthorityOption,
      mintAuthority: decoded.mintAuthority,
      supply: newSupply,
      decimals: decoded.decimals,
      isInitialized: decoded.isInitialized,
      freezeAuthorityOption: decoded.freezeAuthorityOption,
      freezeAuthority: decoded.freezeAuthority,
    },
    newMintData
  );

  svm.setAccount(mint, {
    lamports: existingAccount.lamports,
    data: newMintData,
    owner: TOKEN_PROGRAM_ID,
    executable: false,
  });
}

export function setupTokenAccount(
  owner: PublicKey,
  mint: PublicKey,
  balance: bigint = BigInt(1_000_000_000)
): PublicKey {
  const { svm } = getTestContext();
  
  const ata = getAssociatedTokenAddressSync(mint, owner, true);
  const tokenAccData = Buffer.alloc(ACCOUNT_SIZE);

  AccountLayout.encode(
    {
      mint,
      owner,
      amount: balance,
      delegateOption: 0,
      delegate: PublicKey.default,
      delegatedAmount: 0n,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    tokenAccData
  );

  svm.setAccount(ata, {
    lamports: 1_000_000_000,
    data: tokenAccData,
    owner: TOKEN_PROGRAM_ID,
    executable: false,
  });

  // Also update mint supply to include these tokens
  updateMintSupply(mint, balance);

  return ata;
}

export function getTokenBalance(tokenAccount: PublicKey): bigint {
  const { svm } = getTestContext();
  const account = svm.getAccount(tokenAccount);
  if (!account) return 0n;
  
  const decoded = AccountLayout.decode(Buffer.from(account.data));
  return decoded.amount;
}
