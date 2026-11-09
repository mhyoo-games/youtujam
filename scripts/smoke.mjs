// 켜지는지 확인: 제목 → 곡 고르기 → 첫 곡 시작 → 노트가 판정되는지
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = await import(process.env.PLAYWRIGHT_PATH || 'playwright'); }
const { chromium } = pw;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'], executablePath: process.env.CHROME || undefined });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:8765/index.html?dev=1');
await p.waitForTimeout(800);
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
await p.keyboard.press('Enter'); await p.waitForTimeout(9000);
const t = await p.evaluate(() => window.__yj.play && window.__yj.play.tally);
await b.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
if (!t) { console.error('게임이 시작되지 않음'); process.exit(1); }
const judged = t.counts.PERFECT + t.counts.GREAT + t.counts.GOOD + t.counts.MISS;
console.log('판정된 노트', judged);
if (judged < 1) process.exit(1);
