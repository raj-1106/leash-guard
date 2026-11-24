import express from "express";
import { screenTransaction } from "./screen.js";
import { explain } from "./explain.js";
import { samples } from "./samples.js";
import { page } from "./page.js";
import { SIGNATURE, fetchTransaction } from "./rpc.js";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.get("/", (_req, res) => res.type("html").send(page));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/samples", (_req, res) => samples().then((s) => res.json(s)));

app.post("/screen", async (req, res) => {
  let tx = req.body?.transaction;
  if (typeof tx !== "string") return res.status(400).json({ error: "body must be {transaction: <base64 tx or mainnet signature>}" });
  tx = tx.trim();
  try {
    if (SIGNATURE.test(tx)) tx = await fetchTransaction(tx);
    const v = screenTransaction(tx);
    res.json({ ...v, explanation: await explain(v) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error && e.message.includes("not found") ? e.message : "could not decode transaction" });
  }
});

const port = Number(process.env.PORT ?? 3000);
if (!process.env.VERCEL) app.listen(port, () => console.log(`leash-guard on :${port}`));

export default app;
