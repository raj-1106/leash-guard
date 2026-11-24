import { VersionedTransaction } from "@solana/web3.js";

export type Level = "allow" | "warn" | "block";
export interface Finding {
  level: Level;
  code: string;
  detail: string;
}
export interface Verdict {
  verdict: Level;
  findings: Finding[];
  programs: string[];
}

const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const KNOWN = new Set([
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // associated token
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
]);

// Demo list; in production this comes from a reputation API (see zkTLS step).
export const FLAGGED = new Map<string, string>([
  ["DrainerWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "known wallet-drainer address"],
]);

const LAMPORTS_WARN = 5_000_000_000n; // 5 SOL
const U64_MAX_HALF = 1n << 63n;

function u64(data: Uint8Array, off: number): bigint {
  return Buffer.from(data).readBigUInt64LE(off);
}

export function screenTransaction(b64: string): Verdict {
  const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
  const msg = tx.message;
  const keys = msg.staticAccountKeys.map((k) => k.toBase58());
  const findings: Finding[] = [];
  const programs = new Set<string>();

  if ("addressTableLookups" in msg && msg.addressTableLookups.length > 0) {
    findings.push({
      level: "warn",
      code: "LOOKUP_TABLES",
      detail: "Transaction uses address lookup tables; some accounts cannot be inspected.",
    });
  }

  for (const ix of msg.compiledInstructions) {
    const pid = keys[ix.programIdIndex];
    if (!pid) continue; // program id lives in a lookup table
    programs.add(pid);
    const acct = (i: number) => keys[ix.accountKeyIndexes[i]] ?? "?";
    const d = ix.data;

    if (!KNOWN.has(pid)) {
      findings.push({ level: "warn", code: "UNKNOWN_PROGRAM", detail: `Calls unrecognised program ${pid}.` });
      continue;
    }

    if (pid === SYSTEM) {
      const kind = Buffer.from(d).readUInt32LE(0);
      if (kind === 2) {
        const lamports = u64(d, 4);
        const to = acct(1);
        const flag = FLAGGED.get(to);
        if (flag) findings.push({ level: "block", code: "FLAGGED_DESTINATION", detail: `Sends SOL to ${to}: ${flag}.` });
        if (lamports >= LAMPORTS_WARN)
          findings.push({ level: "warn", code: "LARGE_TRANSFER", detail: `Transfers ${Number(lamports) / 1e9} SOL to ${to}.` });
      } else if (kind === 1 || kind === 10) {
        findings.push({
          level: "block",
          code: "ASSIGN_OWNER",
          detail: `Reassigns ownership of account ${acct(0)}; this can hand the account to another program.`,
        });
      }
    } else if (pid === TOKEN || pid === TOKEN_2022) {
      const kind = d[0];
      if (kind === 4 || kind === 13) {
        const amount = u64(d, 1);
        findings.push(
          amount >= U64_MAX_HALF
            ? { level: "block", code: "UNLIMITED_APPROVAL", detail: `Approves ${acct(1)} to spend an effectively unlimited amount of your tokens.` }
            : { level: "warn", code: "TOKEN_APPROVAL", detail: `Approves ${acct(1)} to spend ${amount} base units of your tokens.` },
        );
      } else if (kind === 6) {
        findings.push({ level: "block", code: "SET_AUTHORITY", detail: `Changes an authority on ${acct(0)}; this can transfer control of the account.` });
      }
    }
  }

  const verdict: Level = findings.some((f) => f.level === "block") ? "block" : findings.length ? "warn" : "allow";
  return { verdict, findings, programs: [...programs] };
}

