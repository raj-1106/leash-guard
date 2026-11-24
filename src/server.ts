import express from "express";
import { screenTransaction } from "./screen.js";
import { explain } from "./explain.js";
import { samples } from "./samples.js";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/samples", (_req, res) => samples().then((s) => res.json(s)));

app.post("/screen", async (req, res) => {
  const tx = req.body?.transaction;
  if (typeof tx !== "string") return res.status(400).json({ error: "body must be {transaction: <base64 serialized tx>}" });
  try {
    const v = screenTransaction(tx);
    res.json({ ...v, explanation: await explain(v) });
  } catch {
    res.status(400).json({ error: "could not decode transaction" });
  }
});

const port = Number(process.env.PORT ?? 3000);
if (!process.env.VERCEL) app.listen(port, () => console.log(`leash-guard on :${port}`));

export default app;
