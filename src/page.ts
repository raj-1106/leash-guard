// Demo page, inlined so it works in Vercel's serverless bundle.
// Keep this file free of backticks and dollar-brace sequences: it is a template literal.
export const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Leash Guard</title>
<style>
  :root {
    --bg-light: #f7f8fa; --bg-dark: #0f1115;
    --surface-light: #ffffff; --surface-dark: #181b21;
    --text-light: #14171c; --text-dark: #eceef2;
    --muted-light: #4d5563; --muted-dark: #a3abb8;
    --border-light: #7b8494; --border-dark: #6b7382;
    --accent-light: #1f4fd8; --accent-dark: #8fb0ff;
    --accent-text-light: #ffffff; --accent-text-dark: #0b1633;
    --allow-light: #11692f; --allow-dark: #6fdc92;
    --warn-light: #8a4b00; --warn-dark: #ffc266;
    --block-light: #b3141b; --block-dark: #ff8d92;

    --bg: var(--bg-light); --surface: var(--surface-light); --text: var(--text-light);
    --muted: var(--muted-light); --border: var(--border-light); --accent: var(--accent-light);
    --accent-text: var(--accent-text-light);
    --allow: var(--allow-light); --warn: var(--warn-light); --block: var(--block-light);

    @media (prefers-color-scheme: dark) {
      --bg: var(--bg-dark); --surface: var(--surface-dark); --text: var(--text-dark);
      --muted: var(--muted-dark); --border: var(--border-dark); --accent: var(--accent-dark);
      --accent-text: var(--accent-text-dark);
      --allow: var(--allow-dark); --warn: var(--warn-dark); --block: var(--block-dark);
    }
    color-scheme: light dark;
    accent-color: var(--accent);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 46rem; margin-inline: auto; padding: 2rem 1rem 3rem; display: grid; gap: 1.25rem; }
  h1 { margin: 0; font-size: 1.9rem; letter-spacing: -0.01em; }
  h2 { margin: 0 0 .5rem; font-size: 1.05rem; }
  .lede { margin: .35rem 0 0; color: var(--muted); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: .75rem; padding: 1.1rem; }
  .chips { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0 1rem; }
  button {
    font: inherit; cursor: pointer; border-radius: .5rem; padding: .5rem .8rem;
    border: 1px solid var(--border); background: var(--surface); color: var(--text);
  }
  button.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; }
  button:disabled { opacity: .6; cursor: progress; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  label { display: block; font-weight: 600; margin-bottom: .35rem; }
  textarea {
    width: 100%; min-height: 6.5rem; resize: vertical; padding: .6rem;
    font: .8rem/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: .5rem;
  }
  .hint { color: var(--muted); font-size: .875rem; margin: .35rem 0 .75rem; }
  .verdict { display: flex; align-items: center; gap: .6rem; font-size: 1.4rem; font-weight: 700; margin: 0 0 .5rem; }
  .verdict .icon { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%;
    border: 2px solid currentColor; font-size: 1.1rem; }
  .allow { color: var(--allow); } .warn { color: var(--warn); } .block { color: var(--block); }
  .explanation { margin: 0 0 .75rem; }
  ul.findings { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }
  ul.findings li { border-left: 4px solid var(--border); padding: .35rem .75rem; background: var(--bg); border-radius: 0 .4rem .4rem 0; color: var(--text); }
  ul.findings li.block { border-color: var(--block); } ul.findings li.warn { border-color: var(--warn); }
  code { font: .8rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
  .tag { display: inline-block; margin-right: .4rem; padding: 0 .4rem; border: 1px solid var(--border); border-radius: .3rem; font-size: .75rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: .3rem 1rem; margin: .5rem 0 0; }
  dt { color: var(--muted); } dd { margin: 0; min-width: 0; }
  a { color: var(--accent); }
  .err { color: var(--block); font-weight: 600; }
  @media (max-width: 30rem) { dl { grid-template-columns: 1fr; } }
  @media (forced-colors: active) { button.primary { border: 2px solid ButtonText; } }
</style>
</head>
<body>
<main>
  <header>
    <h1>Leash Guard</h1>
    <p class="lede">Check a Solana transaction before you sign it. Get a plain-English verdict: allow, warn or block.</p>
  </header>

  <section class="card" aria-labelledby="try">
    <h2 id="try">Try it</h2>
    <div class="chips" id="samples" role="group" aria-label="Sample transactions"></div>
    <label for="tx">Transaction (base64) or mainnet signature</label>
    <textarea id="tx" spellcheck="false" autocomplete="off" aria-describedby="hint"></textarea>
    <p class="hint" id="hint">Paste a serialized transaction, or a signature copied from Solscan.</p>
    <button id="go" class="primary" type="button">Screen transaction</button>
  </section>

  <section class="card" aria-labelledby="res" id="result-card" hidden>
    <h2 id="res">Result</h2>
    <div id="out" role="status" aria-live="polite"></div>
  </section>

  <section class="card" aria-labelledby="zk">
    <h2 id="zk">Verifiable verdicts</h2>
    <p class="hint" style="margin-top:0">
      The same rules also run inside a RISC Zero zkVM, and the proof is verified on zkVerify.
      The proof states: this rule code, run on this transaction hash, produced this verdict, so a verdict can be checked instead of trusted.
      This page does not generate proofs live. The proof below is for a separate example transaction.
    </p>
    <dl>
      <dt>Example</dt><dd>Unlimited token approval, verdict: block</dd>
      <dt>Transaction hash</dt><dd><code>ae22924f6b2001b0f1658ac279595a3ce1f0439e4682cf8153427c0937695f55</code></dd>
      <dt>Rules (image ID)</dt><dd><code>0x2492e5403d52f10342cc107486b3dad27c0dba9d430cb9467da661e415a358ac</code></dd>
      <dt>zkVerify testnet</dt>
      <dd><a href="https://zkverify-testnet.subscan.io/extrinsic/0xf0e9215e067a9558880b3300b9276ad081ac901f7fc82a3e30253eb80ac32c0c" target="_blank" rel="noopener">View verification on Subscan</a></dd>
    </dl>
  </section>
</main>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var ICON = { allow: "\\u2713", warn: "!", block: "\\u2715" };
  var LABEL = { allow: "Allow", warn: "Warning", block: "Block" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function show(node) {
    $("result-card").hidden = false;
    $("out").replaceChildren(node);
  }

  fetch("/samples").then(function (r) { return r.json(); }).then(function (s) {
    Object.keys(s).forEach(function (name) {
      var b = el("button", "", name);
      b.type = "button";
      b.addEventListener("click", function () { $("tx").value = s[name]; screen(); });
      $("samples").append(b);
    });
  });

  function screen() {
    var btn = $("go");
    btn.disabled = true;
    btn.textContent = "Screening\\u2026";
    $("out").setAttribute("aria-busy", "true");
    fetch("/screen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transaction: $("tx").value.trim() })
    })
      .then(function (r) { return r.json(); })
      .then(render)
      .catch(function () { show(el("p", "err", "Could not reach the screening service.")); })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Screen transaction";
        $("out").removeAttribute("aria-busy");
      });
  }

  function render(j) {
    if (j.error) { show(el("p", "err", j.error)); return; }
    var box = el("div");
    var h = el("p", "verdict " + j.verdict);
    var icon = el("span", "icon", ICON[j.verdict]);
    icon.setAttribute("aria-hidden", "true");
    h.append(icon, el("span", "", LABEL[j.verdict]));
    box.append(h, el("p", "explanation", j.explanation));
    if (j.findings.length) {
      var ul = el("ul", "findings");
      j.findings.forEach(function (f) {
        var li = el("li", f.level);
        li.append(el("span", "tag", f.code), document.createTextNode(f.detail));
        ul.append(li);
      });
      box.append(ul);
    }
    show(box);
  }

  $("go").addEventListener("click", screen);
</script>
</body>
</html>
`;
