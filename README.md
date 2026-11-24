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

## Limitations

- The flagged-address list is a small demo list, not a live reputation feed.
- Program recognition covers the core Solana programs plus a short list of popular DeFi programs (Jupiter, Raydium, Orca, Meteora, Pump). Recognised means common, not audited. Anything else is a warning, which will include many legitimate programs.
- It does not simulate transactions or resolve lookup tables, so it can miss risks that only show up at execution time.
- Not a substitute for an audit. It is a pre-sign checklist.

## Roadmap

- **zkVerify / zkTLS (not implemented yet):** prove that a reputation-API response the agent relied on (for example "address X is flagged") was really fetched, and anchor the proof on zkVerify so reviewers can check the claim.
- Watch Leash (Solana timelock vault) vaults and use the timelock window to alert the owner about suspicious pending withdrawals.
- Replace the demo blocklist with a real reputation source.

## Stack

TypeScript, Express, `@solana/web3.js`, Gemini API, deployed on Vercel.
