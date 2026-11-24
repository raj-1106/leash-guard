// Usage: KURIER_API_KEY=... node scripts/submit-proof.mjs zk/proofs/unlimited-approval.json
// Registers the image ID as a risc0 VK, submits the proof to Kurier testnet, and polls until finalized.
import { readFileSync } from "node:fs";

const KEY = process.env.KURIER_API_KEY;
const BASE = process.env.KURIER_URL ?? "https://api-testnet.kurier.xyz/api/v1";
const VERSION = process.env.RISC0_VERSION ?? "V3_0";
if (!KEY) throw new Error("set KURIER_API_KEY");
const proof = JSON.parse(readFileSync(process.argv[2], "utf8"));

async function post(path, body) {
  const r = await fetch(`${BASE}/${path}/${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

const reg = await post("register-vk", { proofType: "risc0", proofOptions: { version: VERSION }, vk: proof.image_id });
// A repeat registration returns the existing hash in `meta.vkHash`.
const vkHash = reg.body.vkHash ?? reg.body.meta?.vkHash;
if (!vkHash) throw new Error("register-vk failed: " + JSON.stringify(reg));

const sub = await post("submit-proof", {
  proofType: "risc0",
  vkRegistered: true,
  proofOptions: { version: VERSION },
  proofData: { proof: proof.proof, publicSignals: proof.pub_inputs, vk: vkHash },
});
console.log("submit:", sub.status, JSON.stringify(sub.body));
const jobId = sub.body.jobId;
if (!jobId) process.exit(1);

for (;;) {
  const r = await fetch(`${BASE}/job-status/${KEY}/${jobId}`);
  const j = await r.json();
  console.log(j.status, j.txHash ?? "");
  if (["Finalized", "Failed"].includes(j.status)) {
    console.log(JSON.stringify(j, null, 2));
    break;
  }
  await new Promise((r) => setTimeout(r, 5000));
}
