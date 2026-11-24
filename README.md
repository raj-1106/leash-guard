# Leash Guard

A wallet and transaction guard agent for Solana. Paste a transaction before you sign it, and Leash Guard tells you in plain English whether it is safe, risky, or should be blocked.

Built for the zkVerify Agent Games, Wildcard track.

**Live demo:** `<your-vercel-url>`  
**Endpoint:** `POST <your-vercel-url>/screen`

## The problem

Most wallet drains don't exploit a bug. The user signs something they don't understand: an unlimited token approval, an authority change, a call to an unknown program. Wallet prompts show raw instructions and addresses that non-experts can't read.

## Who it helps

Anyone who signs Solana transactions, especially people interacting with new dApps, and apps that want a pre-sign safety check for their users.

## What it does

1. Takes a base64 serialized Solana transaction (legacy or v0), or a mainnet transaction signature (for example from Solscan).
2. Decodes every instruction and runs rule checks:
   - unlimited token approvals (`Approve` / `ApproveChecked`) → **block**
   - authority changes (`SetAuthority`) → **block**
   - account ownership reassignment (`Assign`) → **block**
   - transfers to flagged addresses → **block**
   - calls to unrecognised programs → **warn**
   - large SOL transfers (5 SOL or more) → **warn**
   - address lookup tables, which hide accounts from inspection → **warn**
3. Returns a verdict (`allow`, `warn`, `block`), the findings, and a plain-English explanation written by Gemini. If Gemini is unavailable, a templated explanation is used.

The verdict comes from the deterministic rules. The LLM only explains the findings and cannot change the verdict.

## Try it

Open the demo page and click one of the four samples, or call the API:

```bash
curl -s -X POST <your-vercel-url>/screen \
  -H "content-type: application/json" \
  -d '{"transaction":"<base64 transaction>"}'
```

Example response:

```json
{
  "verdict": "block",
  "findings": [
    { "level": "block", "code": "UNLIMITED_APPROVAL", "detail": "Approves 5gbH... to spend an effectively unlimited amount of your tokens." }
  ],
  "programs": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
  "explanation": "..."
}
```

Other routes: `GET /samples` (sample transactions), `GET /health`.

## Run locally

```bash
npm install
cp .env.example .env   # optional: set GEMINI_API_KEY
npm start              # http://localhost:3000
npm test
```

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables LLM explanations. Without it, templated explanations are used. |
| `GEMINI_MODEL` | Gemini model name. Defaults to `gemini-3.8-flash`. |
| `PORT` | Local port. Defaults to 3000. |

## Key decisions

- **Rules decide, the LLM explains.** A security verdict must be reproducible and can't depend on model output.
- **Screening itself is offline.** The agent works from the serialized transaction alone. The only network call is optional: if you paste a mainnet signature, it fetches that transaction from a public RPC (`SOLANA_RPC_URL`, default `api.mainnet-beta.solana.com`).
- **Fails safe on what it can't see.** Lookup-table accounts can't be inspected offline, so the agent warns instead of passing them.

## Verifiable verdicts (zkVerify)

The screening rules are also implemented in Rust (`zk/core`) and run inside a RISC Zero zkVM (`zk/methods/guest`). The proof says: *this exact rule code, run on the transaction with this SHA-256, produced this verdict.* The guest's image ID pins the rules, so nobody (including an LLM or the server operator) can change a verdict without the proof failing.

Public output (journal): `sha256(transaction) || verdict`, where verdict is `00` allow, `01` warn, `02` block.

**Example, verified on zkVerify testnet:** the unlimited-token-approval sample.

| | |
| --- | --- |
| Image ID | `0x2492e5403d52f10342cc107486b3dad27c0dba9d430cb9467da661e415a358ac` |
| Journal | `0xae22924f6b2001b0f1658ac279595a3ce1f0439e4682cf8153427c0937695f5502` (tx hash `ae2292...5f55`, verdict `02` = block) |
| zkVerify tx | [`0xf0e9215e...32c0c`](https://zkverify-testnet.subscan.io/extrinsic/0xf0e9215e067a9558880b3300b9276ad081ac901f7fc82a3e30253eb80ac32c0c) |

Reproduce:

```bash
cd zk && cargo build --release
RISC0_DEV_MODE=0 ./target/release/host "<base64 tx>" proofs/out.json   # ~3 min on 2 cores
KURIER_API_KEY=... node ../scripts/submit-proof.mjs zk/proofs/out.json  # Kurier testnet
```

Caveats, stated plainly:
- The live `/screen` endpoint does **not** generate proofs; proving takes minutes. Proofs are generated offline, and one is published for the sample above.
- The Rust rules are a port of the TypeScript rules. Parity is tested on the four sample transactions only.
- Proofs use RISC Zero **3.0.6**, pinned from git because that is the line zkVerify's `V3_0` verifier accepts (3.1.0 proofs were not accepted). risc0 3.0.x is yanked on crates.io, and the 3.1.0 release notes describe soundness fixes, so treat this as a testnet demonstration, not a production guarantee.
- This is testnet only.

## Limitations

- The flagged-address list is a small demo list, not a live reputation feed.
- Program recognition covers the core Solana programs plus a short list of popular DeFi programs (Jupiter, Raydium, Orca, Meteora, Pump). Recognised means common, not audited. Anything else is a warning, which will include many legitimate programs.
- It does not simulate transactions or resolve lookup tables, so it can miss risks that only show up at execution time.
- Not a substitute for an audit. It is a pre-sign checklist.

## Roadmap

- Move to a current RISC Zero release once zkVerify supports it, and prove on demand.
- zkTLS: prove that a reputation-API response the agent relied on (for example "address X is flagged") was really fetched.
- Watch Leash (Solana timelock vault) vaults and use the timelock window to alert the owner about suspicious pending withdrawals.
- Replace the demo blocklist with a real reputation source.

## Stack

TypeScript, Express, `@solana/web3.js`, Gemini API, deployed on Vercel.
