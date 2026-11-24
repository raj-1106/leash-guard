import type { Verdict } from "./screen.js";

function template(v: Verdict): string {
  if (v.verdict === "allow") return "No risky patterns found. This looks like a routine transaction.";
  return v.findings.map((f) => f.detail).join(" ");
}

export async function explain(v: Verdict): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return template(v);
  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const prompt =
    `You are a wallet security assistant. In 2-3 plain sentences, tell a non-technical user what this Solana transaction does and why it is ${v.verdict}. ` +
    `Do not invent facts beyond these findings.\n${JSON.stringify(v.findings)}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return template(v);
    const j: any = await r.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || template(v);
  } catch {
    return template(v);
  }
}
