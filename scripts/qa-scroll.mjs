// Scroll walk-through for the home page story. Needs the dev server running and Google Chrome (macOS path).
// It scrolls in equal steps, prints what is visible at each stop, and saves one screenshot per stop.
//
//   node scripts/qa-scroll.mjs <outPrefix> <width> <height> <url> <stepScreens> <steps> [reduced]
//
// Whole screens:   node scripts/qa-scroll.mjs /tmp/qa 1440 900 http://localhost:4321/ 1 4
// Page-down keys:  node scripts/qa-scroll.mjs /tmp/qa 1440 900 http://localhost:4321/ 0.87 5
// A menu link:     node scripts/qa-scroll.mjs /tmp/qa 1440 900 http://localhost:4321/#safety 1 0
//
// Expected at whole screens 0 to 4: hero 1.00; statement 1.00; then chapters 1, 2 and 3 at 1.00 in turn.
const [prefix, W, H, url, stepArg, stepsArg, reduced] = process.argv.slice(2);
const { spawn } = await import("node:child_process");
const fs = await import("node:fs");
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", `--user-data-dir=/tmp/shoot-${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } if (d.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 300)); };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 760 });
if (reduced) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.navigate", { url });
await sleep(3000);
const probe = `(() => { const o = (s) => [...document.querySelectorAll(s)].map((e) => (+getComputedStyle(e).opacity).toFixed(2)); return JSON.stringify({ y: Math.round(scrollY), hero: o('[data-hero]')[0], statement: o('[data-manifesto]')[0], chapters: o('[data-chapter]').join(' '), controls: o('[data-controls]')[0], nav: document.documentElement.dataset.nav, bar: Math.round(document.querySelector('header[data-nav] .announce')?.getBoundingClientRect().height ?? -1) }); })()`;
const rows = [];
for (let k = 0; k <= +stepsArg; k++) {
  const y = Math.round(k * +stepArg * +H);
  if (+stepsArg > 0) await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y})` });
  await sleep(1700);
  const r = await send("Runtime.evaluate", { expression: probe });
  rows.push({ screens: (k * +stepArg).toFixed(2), ...JSON.parse(r.result.value) });
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 70 });
  fs.writeFileSync(`${prefix}_${String(k).padStart(2, "0")}.jpg`, Buffer.from(data, "base64"));
}
console.log("screens  y     hero stmt chapters        ctl  nav   bar");
for (const r of rows) console.log(`${r.screens.padEnd(7)}  ${String(r.y).padEnd(5)} ${r.hero} ${r.statement} ${r.chapters.padEnd(15)} ${r.controls} ${String(r.nav).padEnd(5)} ${r.bar}`);
if (errors.length) console.log("ERRORS:", errors.join("\n"));
ws.close(); chrome.kill();
