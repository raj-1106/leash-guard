import test from "node:test";
import assert from "node:assert/strict";
import { screenTransaction } from "../src/screen.js";
import { samples } from "../src/samples.js";

const s = await samples();

test("safe transfer is allowed", () => {
  assert.equal(screenTransaction(s["Safe: send 0.1 SOL"]).verdict, "allow");
});
test("unlimited approval is blocked", () => {
  const v = screenTransaction(s["Risky: unlimited token approval"]);
  assert.equal(v.verdict, "block");
  assert.equal(v.findings[0].code, "UNLIMITED_APPROVAL");
});
test("set authority is blocked", () => {
  assert.equal(screenTransaction(s["Risky: hand over account authority"]).findings[0].code, "SET_AUTHORITY");
});
test("unknown program warns", () => {
  assert.equal(screenTransaction(s["Risky: unknown program"]).verdict, "warn");
});
