const RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

export const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export async function fetchTransaction(signature: string): Promise<string> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "base64", maxSupportedTransactionVersion: 0 }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const j: any = await r.json();
  const tx = j.result?.transaction?.[0];
  if (typeof tx !== "string") throw new Error("transaction not found on mainnet");
  return tx;
}
