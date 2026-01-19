import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, Connection } from "@solana/web3.js";
import { MirageBridge } from "../../target/types/mirage_bridge";
import { LiteSVM } from "litesvm";

export interface TestContext {
  svm: LiteSVM;
  provider: AnchorProvider;
  program: Program<MirageBridge>;
  connection: Connection;
  authority: Keypair;
}

let globalTestContext: TestContext;

export const getTestContext = () => globalTestContext;
export const setTestContext = (context: TestContext) => {
  globalTestContext = context;
};
