import type { Blockhash } from "@solana/web3.js";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";

const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const blockhash = "11111111111111111111111111111111" as Blockhash;
const newKey = async () => (await Keypair.generate()).publicKey;

function build(payer: PublicKey, ixs: TransactionInstruction[]): string {
  const m = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(m).serialize()).toString("base64");
}

function tokenIx(data: number[], keys: PublicKey[]): TransactionInstruction {
  return new TransactionInstruction({
    programId: TOKEN,
    keys: keys.map((pubkey, i) => ({ pubkey, isSigner: i === keys.length - 1, isWritable: true })),
    data: Buffer.from(data),
  });
}

const u64max = [255, 255, 255, 255, 255, 255, 255, 255];

export async function samples(): Promise<Record<string, string>> {
  const [payer, other, third, prog] = [await newKey(), await newKey(), await newKey(), await newKey()];
  return {
    "Safe: send 0.1 SOL": build(payer, [SystemProgram.transfer({ fromPubkey: payer, toPubkey: other, lamports: 100_000_000 })]),
    "Risky: unlimited token approval": build(payer, [tokenIx([4, ...u64max], [other, third, payer])]),
    "Risky: hand over account authority": build(payer, [tokenIx([6, 2, 1, ...Array(32).fill(7)], [other, payer])]),
    "Risky: unknown program": build(payer, [
      new TransactionInstruction({ programId: prog, keys: [{ pubkey: payer, isSigner: true, isWritable: true }], data: Buffer.from([1]) }),
    ]),
  };
}
