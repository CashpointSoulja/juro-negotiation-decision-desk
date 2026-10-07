// Records the walkthrough against the running production build and writes segment offsets for audio sync.
// Usage: DISPLAY=:99 node video/record.mjs [baseUrl]   (needs an X display of at least 1366x1000; the page area below the browser toolbar is captured with ffmpeg x11grab)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const durs = JSON.parse(readFileSync('video/out/durations.json', 'utf8'));
const W = 1366, H = 854;

// Fresh profile with the "show downloads when done" bubble turned off, so exports don't cover the page.
const profile = mkdtempSync(join(tmpdir(), 'ndd-rec-'));
mkdirSync(join(profile, 'Default'));
writeFileSync(join(profile, 'Default', 'Preferences'), JSON.stringify({ download_bubble: { partial_view_enabled: false } }));
const context = await chromium.launchPersistentContext(profile, { headless: false, viewport: null, acceptDownloads: true, args: [`--window-size=${W},${H + 87}`, '--window-position=0,0', '--disable-infobars', '--hide-scrollbars'] });
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('div');
    p.id = 'demo-pointer';
    p.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(p.style, { position: 'fixed', left: '0', top: '0', zIndex: '9999', pointerEvents: 'none', transition: 'transform .7s cubic-bezier(.4,0,.2,1)', transform: 'translate(683px, 500px)' });
    const ring = document.createElement('div');
    ring.id = 'demo-ring';
    Object.assign(ring.style, { position: 'fixed', left: '-14px', top: '-14px', width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #7a6a00', zIndex: '9998', pointerEvents: 'none', opacity: '0', transition: 'opacity .25s, transform .25s' });
    document.body.append(p, ring);
  });
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto(BASE + '#/review');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
let [top, innerH] = await page.evaluate(() => [window.outerHeight - window.innerHeight, window.innerHeight]);
if (innerH !== H) {
  const cdp = await context.newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: W, height: H + top } });
  await page.waitForTimeout(800);
  [top, innerH] = await page.evaluate(() => [window.outerHeight - window.innerHeight, window.innerHeight]);
}
if (innerH !== H) throw new Error(`page height ${innerH}, expected ${H}`);
console.log('toolbar', top, 'page height', innerH);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', '30', '-video_size', `${W}x${H}`, '-i', `${process.env.DISPLAY}+0,${top}`, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p', 'video/out/screen.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
await new Promise((r) => setTimeout(r, 600));
const t0 = Date.now();
const sleep = (ms) => page.waitForTimeout(ms);
const now = () => (Date.now() - t0) / 1000;

let pos = { x: 683, y: 500 };
async function moveTo(loc, dx = 0.5, dy = 0.5) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  pos = { x: b.x + b.width * dx, y: b.y + b.height * dy };
  await page.evaluate(({ x, y }) => { document.getElementById('demo-pointer').style.transform = `translate(${x - 3}px, ${y - 2}px)`; }, pos);
  await sleep(800);
}
async function click(loc) {
  await moveTo(loc);
  await page.evaluate(({ x, y }) => { const r = document.getElementById('demo-ring'); r.style.transform = `translate(${x}px, ${y}px) scale(1.4)`; r.style.opacity = '1'; setTimeout(() => { r.style.opacity = '0'; }, 350); }, pos);
  await loc.click();
  await sleep(500);
}
async function scrollTo(y) {
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'smooth' }), y);
  await sleep(1000);
}
const offsets = {};
async function segment(id, fn) {
  const start = now();
  offsets[id] = start;
  await fn();
  const left = start + durs[id] + 0.7 - now();
  if (left > 0) await sleep(left * 1000);
  console.log(id, start.toFixed(2), 'actions overran by', Math.max(0, -left).toFixed(2));
}

page.on('dialog', (d) => d.accept());
await sleep(800);

const contractSel = page.getByRole('combobox', { name: 'Contract', exact: true });
const playbookSel = page.getByRole('combobox', { name: 'Playbook', exact: true });
const clauses = page.getByRole('navigation', { name: 'Clauses' });

await segment('seed', async () => {
  await sleep(1500);
  await moveTo(contractSel, 0.3);
  await sleep(1800);
  await moveTo(playbookSel, 0.3);
  await sleep(2200);
  await moveTo(clauses.getByRole('button').first(), 0.6);
});
await segment('checks', async () => {
  await sleep(600);
  await moveTo(page.locator('.compare .card').first(), 0.5, 0.5);
  await moveTo(page.locator('mark').first());
  await sleep(1500);
  await moveTo(page.locator('.cite').first(), 0.4, 0.2);
  await sleep(1500);
  await moveTo(page.locator('.cite .dev').first(), 0.4);
  await sleep(1500);
  await moveTo(page.locator('.trace li').last(), 0.4);
});
await segment('success', async () => {
  await scrollTo(220);
  await sleep(1200);
  await click(page.getByRole('button', { name: 'Auto-accept' }));
  await sleep(800);
  await moveTo(page.locator('.timeline li').first(), 0.3);
});
await segment('switch', async () => {
  await scrollTo(0);
  await moveTo(contractSel, 0.3);
  await contractSel.selectOption('brightwater');
  await sleep(1400);
  await moveTo(page.locator('mark').first());
  await sleep(1400);
  await moveTo(playbookSel, 0.3);
  await playbookSel.selectOption('alder');
  await sleep(600);
  await moveTo(page.locator('.decision .pill').first());
});
await segment('blocked', async () => {
  await click(clauses.getByRole('button', { name: /12\. Indemnities/ }));
  await sleep(800);
  await moveTo(page.locator('.cite').nth(0), 0.4, 0.3);
  await sleep(900);
  await moveTo(page.locator('.cite').nth(1), 0.4, 0.3);
  await sleep(700);
  await scrollTo(430);
  await moveTo(page.getByRole('button', { name: 'Auto-accept' }));
  await sleep(500);
  await click(page.getByRole('button', { name: 'Accept (override)' }));
  await sleep(1200);
  await click(page.getByRole('button', { name: 'Reject, counter with standard' }));
});
await segment('edit', async () => {
  await scrollTo(0);
  await moveTo(playbookSel, 0.3);
  await playbookSel.selectOption('fernbrook');
  await sleep(400);
  await click(clauses.getByRole('button', { name: /11\. Limitation/ }));
  await click(page.getByRole('button', { name: 'Edit wording' }));
  const box = page.getByRole('textbox', { name: /Edit the proposed wording/ });
  const text = await box.inputValue();
  const i = text.indexOf('twice the total fees');
  await box.fill(text.slice(0, i));
  await box.pressSequentially('100% of the fees' + text.slice(i + 'twice the total fees'.length), { delay: 8 });
  await moveTo(page.locator('.compare .pill').last());
  await click(page.getByRole('button', { name: 'Save edit' }));
});
await segment('export', async () => {
  await scrollTo(0);
  await click(page.getByRole('button', { name: 'Export review memo' }));
  await sleep(1400);
  await click(page.getByRole('link', { name: 'Evals' }));
  await sleep(1200);
  await moveTo(page.locator('.metric').nth(1));
  await sleep(1000);
  await moveTo(page.locator('.gate'), 0.2);
  await sleep(700);
  await scrollTo(380);
  await moveTo(page.locator('tbody tr').nth(1), 0.6);
  await sleep(600);
  await scrollTo(0);
  await click(page.getByRole('button', { name: 'Export eval report' }));
});
await sleep(1500);
const total = now();
ff.stdin.write('q');
await new Promise((r) => ff.on('close', r));
await context.close();
writeFileSync('video/out/offsets.json', JSON.stringify({ offsets, total }, null, 1));
console.log('total', total.toFixed(2));
