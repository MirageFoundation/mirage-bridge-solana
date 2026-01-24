import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MirageBridge } from "../../target/types/mirage_bridge";
import { LiteSVM } from "litesvm";
import IDL from "../../target/idl/mirage_bridge.json";
import { TestContext } from "./setup";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export async function initializeTestContext(): Promise<TestContext> {
  const authority = Keypair.generate();

  const svm = new LiteSVM();

  svm.airdrop(authority.publicKey, BigInt(1000 * LAMPORTS_PER_SOL));

  const programId = new PublicKey(IDL.address);
  svm.addProgramFromFile(programId, "target/deploy/mirage_bridge.so");

  // Load Token Metadata program for metadata creation
  svm.addProgramFromFile(METADATA_PROGRAM_ID, "tests/programs/mpl_token_metadata.so");

  const connection = {
    ...svm,
    getLatestBlockhash: async (commitment?: string) => {
      return {
        blockhash: svm.latestBlockhash(),
        lastValidBlockHeight: 0,
      };
    },
    confirmTransaction: async (signature: string) => {
      return { value: { err: null } };
    },
    getSignatureStatus: async (signature: string) => {
      return { value: { confirmationStatus: "confirmed", err: null } };
    },
    sendRawTransaction: async (
      rawTransaction: Buffer | Uint8Array,
      options?: any
    ) => {
      const signature =
        "mock-signature-" + Math.random().toString(36).substring(7);
      return signature;
    },
    sendTransaction: (tx: any, signers?: any[]) => {
      return svm.sendTransaction(tx);
    },
    getAccountInfo: async (address: PublicKey, commitment?: string) => {
      const account = svm.getAccount(address);
      if (!account) return null;

      return {
        executable: account.executable,
        owner: account.owner,
        lamports: account.lamports,
        data: Buffer.from(account.data),
        rentEpoch: account.rentEpoch || 0,
      };
    },
    getAccountInfoAndContext: async (
      address: PublicKey,
      commitment?: string
    ) => {
      const accountInfo = await connection.getAccountInfo(address, commitment);
      return {
        context: { slot: 0 },
        value: accountInfo,
      };
    },
  } as any;

  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const program = new Program<MirageBridge>(IDL as MirageBridge, provider);

  return {
    svm,
    provider,
    program,
    connection,
    authority,
  };
}
