// 유튜잼: 화면·입력·게임 진행
import { SONGS } from './core/songs.ts';
import type { Song } from './core/music.ts';
import { fromSong, fromBeat, cleanRecorded, levelNumber, arrangeTaps, type Chart, type Note, type Level } from './core/chart.ts';
import { type Style, STYLE_KO, STYLE_DESC, lanesFor, hammerLane, orbitKey, squeeze, toOrbit, orbitPath, orbitAt, type Tile } from './core/styles.ts';
import { grade, releaseGrade, newTally, apply, accuracy, rank, WINDOWS, earlyLate, typicalOffsetMs, type Grade, type Tally } from './core/judge.ts';
import { KEYMAPS, KEYLABEL, youtubeId, tapBpm, calibrate } from './core/keys.ts';
import { Synth, Sfx } from './audio/synth.ts';
import { YtClock } from './yt/youtube.ts';
import * as Lib from './core/library.ts';

const W = 960, H = 540; // 메뉴 화면은 960×540 기준
// 실제 화면 폭: 휴대폰 가로처럼 길쭉하면 넓혀서 꽉 채운다 (하는 중 화면은 VW를 다 쓴다)
let VW = 960;
/** 메뉴 화면을 가운데 두려고 미는 만큼 */
let OX = 0;
const cv = document.getElementById('c') as HTMLCanvasElement;
// desynchronized: 화면에 그리는 지연을 줄인다 (지원하는 브라우저만)
const g = (cv.getContext('2d', { desynchronized: true, alpha: false }) ?? cv.getContext('2d'))!;
const wrap = document.getElementById('wrap')!;
const ytBox = document.getElementById('yt')!;
const form = document.getElementById('form')!;
const urlIn = document.getElementById('url') as HTMLInputElement;
const fileIn = document.getElementById('file') as HTMLInputElement;

// ── 화면 맞추기 (비율 유지, 창 가득) ──
const stage = document.getElementById('stage')!;
let SX = 1, SY = 1;
function fit(): void {
  // 안전 영역(아이폰 노치·홈 막대)을 뺀 자리에 맞춘다
  const r = stage.getBoundingClientRect();
  const aw = Math.max(1, r.width), ah = Math.max(1, r.height);
  VW = typeof phone === 'function' && phone() && aw / ah > W / H ? Math.min(1320, Math.round((H * aw) / ah)) : W;
  const s = Math.min(aw / VW, ah / H);
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(VW * s * dpr); cv.height = Math.round(H * s * dpr);
  cv.style.width = `${VW}px`; cv.style.height = `${H}px`;
  wrap.style.width = `${VW}px`;
  SX = cv.width / VW; SY = cv.height / H;
  g.setTransform(SX, 0, 0, SY, 0, 0);
  wrap.style.transform = `translate(-50%, -50%) scale(${s})`;
  wrap.style.transformOrigin = 'center';
}
window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 250));

// ── 그림 (Kenney UI Pack, CC0) ──
const IMG = new Map<string, HTMLImageElement>();
function img(n: string): HTMLImageElement {
  let im = IMG.get(n);
  if (!im) { im = new Image(); im.src = `./assets/ui/${n}.png`; IMG.set(n, im); }
  return im;
}
const COLORS = ['blue', 'green', 'red', 'yellow', 'grey'];
for (const c of COLORS) for (const n of ['button_round_depth_gloss', 'button_rectangle_depth_gloss', 'button_rectangle_depth_flat', 'button_rectangle_flat', 'star', 'button_square_depth_gloss']) img(`${c}_${n}`);
// 예전 리듬 게임처럼 흰·파랑 건반이 번갈아 있고, 가운데는 노랑
const LANE_COLOR: Record<number, string[]> = {
  4: ['white', 'blue', 'blue', 'white'],
  5: ['white', 'blue', 'yellow', 'blue', 'white'],
  6: ['white', 'blue', 'white', 'white', 'blue', 'white'],
  7: ['white', 'blue', 'white', 'yellow', 'white', 'blue', 'white'],
};
const KEY_SPRITE: Record<string, string> = { white: 'grey', blue: 'blue', yellow: 'yellow' };
// 노트 막대 색: [밝은 위, 가운데, 어두운 아래]
const NOTE_GRAD: Record<string, [string, string, string]> = {
  white: ['#ffffff', '#dfe4f2', '#9aa3bd'],
  blue: ['#bfe6ff', '#3fa2ff', '#1a4fa8'],
  yellow: ['#fff3b8', '#ffc83d', '#b9780e'],
};
function laneW(lanes: number): number {
  const t: Record<number, number> = phone() ? { 4: 138, 5: 114, 6: 96, 7: 84 } : { 4: 78, 5: 66, 6: 58, 7: 52 };
  return t[lanes] ?? 52;
}
const HEX: Record<string, string> = { blue: '#4fb0ff', green: '#4fe08a', red: '#ff5a6e', yellow: '#ffc94f', grey: '#d9dcef', white: '#e8ecff' };

const synth = new Synth();
const sfx = new Sfx(synth, './');
const yt = new YtClock();

// ── 설정 (브라우저에 저장) ──
interface Settings { style: Style; lanes: number; speed: number; offset: number; noFail: boolean; level: Level; hitSound: string; hitVol: number; meter: boolean; mobile: string; vibrate: boolean }
const DEF: Settings = { style: 'keys', lanes: 4, speed: 2.5, offset: 0, noFail: false, level: 'normal', hitSound: 'tok', hitVol: 0.6, meter: true, mobile: 'auto', vibrate: true };
const HIT_SOUNDS = ['tok', 'tak', 'chak', 'kung', 'off'];
const HIT_KO: Record<string, string> = { tok: '톡 (나무)', tak: '딱 (테두리)', chak: '착 (심벌)', kung: '쿵 (북)', off: '끔' };
function loadJson<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; }
}
function saveJson(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } }
const set: Settings = loadJson('yj_settings', DEF);
if (!['keys', 'hammer', 'orbit'].includes(set.style)) set.style = 'keys';
/** 건반 4·5·6·7 → 망치 → 궤도 를 한 줄로 돌려 고른다 */
const KINDS: Array<[Style, number]> = [['keys', 4], ['keys', 5], ['keys', 6], ['keys', 7], ['hammer', 0], ['orbit', 0]];
function kindLabel(): string { return set.style === 'keys' ? `${set.lanes}건반` : STYLE_KO[set.style]; }
function cycleKind(d: number): void {
  const i = KINDS.findIndex(([st, l]) => st === set.style && (st !== 'keys' || l === set.lanes));
  const [st, l] = KINDS[(i + d + KINDS.length) % KINDS.length];
  set.style = st; if (st === 'keys') set.lanes = l;
  saveJson('yj_settings', set);
}
/** 지금 방식의 칸 수 */
function playLanes(): number { return lanesFor(set.style, set.lanes); }
/** 자체곡 채보 (방식에 맞춰) */
function songChart(song: Song, level: Level): Chart {
  if (set.style === 'orbit') return { notes: toOrbit(fromSong(song, 1, level).notes, song.bpm, level), lanes: 1, level };
  return fromSong(song, playLanes(), level);
}
// 예전엔 타격음이 켬/끔이었음
if (typeof (set.hitSound as unknown) === 'boolean') set.hitSound = (set.hitSound as unknown) ? 'tok' : 'off';
if (!HIT_SOUNDS.includes(set.hitSound)) set.hitSound = 'tok';

// ── 휴대폰 모드: 손가락으로 하는 기기면 건반을 크게, 칠 때 진동 ──
const coarse = matchMedia('(pointer: coarse)').matches;
const MOBILE = ['auto', 'on', 'off'];
const MOBILE_KO: Record<string, string> = { auto: `자동 (${coarse ? '휴대폰' : 'PC'})`, on: '켬', off: '끔' };
function phone(): boolean { return set.mobile === 'on' || (set.mobile === 'auto' && coarse); }
function buzz(ms: number): void { if (set.vibrate && phone()) navigator.vibrate?.(ms); }

// ── 전체 화면 ──
let toast = '', toastAt = -9999;
function say(t: string): void { toast = t; toastAt = performance.now(); }
function isFs(): boolean { return !!(document.fullscreenElement || (document as any).webkitFullscreenElement); }
// 아이폰은 브라우저 전체 화면이 없다 → 홈 화면에 추가하면 앱처럼 꽉 찬 화면으로 열린다
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
function fsApi(): boolean { const el = document.documentElement as any; return !!(el.requestFullscreen || el.webkitRequestFullscreen); }
/** 전체 화면 버튼을 보일지 (이미 홈 화면 앱이면 필요 없음) */
function fsOffer(): boolean { return !standalone && (fsApi() || isIOS); }
let iosGuide = false;
// 아이폰 무음 모드에서도 소리가 나게 (지원하는 iOS만)
try { const as = (navigator as any).audioSession; if (as) as.type = 'playback'; } catch { /* */ }
function toggleFs(): void {
  const el = document.documentElement as any;
  if (isFs()) { (document.exitFullscreen ?? (document as any).webkitExitFullscreen)?.call(document); return; }
  const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (!req) { if (isIOS) iosGuide = true; else say('이 기기는 전체 화면을 못 해요.'); return; }
  Promise.resolve(req.call(el, { navigationUI: 'hide' }))
    .then(() => (window.screen.orientation as any)?.lock?.('landscape').catch(() => {}))
    .catch(() => say('전체 화면을 켜지 못했어요. 한 번 더 눌러 보세요.'));
}
document.addEventListener('fullscreenchange', () => fit());
fit();
const best: Record<string, { score: number; rank: string }> = loadJson('yj_best', {});

// ── 그리기 도우미 ──
function text(s: string, x: number, y: number, size = 16, col = '#fff', align: CanvasTextAlign = 'left', font = 'Galmuri'): void {
  g.font = `${size}px ${font}`;
  g.textAlign = align; g.textBaseline = 'middle';
  // 밝은 글자에만 테두리 (밝은 버튼 위 어두운 글자는 테두리 없이)
  const n = parseInt(col.slice(1, 3), 16) + parseInt(col.slice(3, 5), 16) + parseInt(col.slice(5, 7), 16);
  if (!(col.length === 7 && n < 360)) { g.lineWidth = Math.max(3, size / 5); g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,8,20,0.85)'; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}
function nine(im: HTMLImageElement, x: number, y: number, w: number, h: number, m = 16): void {
  if (!im.complete || !im.naturalWidth) { g.fillStyle = '#334'; g.fillRect(x, y, w, h); return; }
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const sx = [0, m, iw - m, iw], dx = [x, x + m, x + w - m, x + w];
  const sy = [0, m, ih - m, ih], dy = [y, y + m, y + h - m, y + h];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const sw = sx[i + 1] - sx[i], sh = sy[j + 1] - sy[j], dw = dx[i + 1] - dx[i], dh = dy[j + 1] - dy[j];
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) g.drawImage(im, sx[i], sy[j], sw, sh, dx[i], dy[j], dw, dh);
  }
}
function button(label: string, x: number, y: number, w: number, h: number, on: boolean, color = 'blue'): void {
  nine(img(`${on ? 'yellow' : color}_button_rectangle_depth_gloss`), x, y, w, h, 18);
  text(label, x + w / 2, y + h / 2 - 3, 16, on ? '#3b2a00' : '#fff', 'center');
}

// ── 배경: 박자에 맞춰 출렁이는 줄무늬 ──
let beatPulse = 0;
function background(t: number, accent = '#4fb0ff'): void {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#120f27'); grd.addColorStop(1, '#2a1640');
  g.fillStyle = grd; g.fillRect(-OX, 0, VW, H);
  g.save();
  g.globalAlpha = 0.18 + beatPulse * 0.25;
  g.translate(-OX, 0);
  for (let i = 0; i < Math.ceil((VW + 200) / 90) + 1; i++) {
    const x = ((i * 90 + t * 40) % (VW + 290)) - 100;
    g.fillStyle = i % 2 ? accent : '#ffffff';
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + 40, H); g.lineTo(x + 260, 0); g.lineTo(x + 220, 0); g.fill();
  }
  g.restore();
  beatPulse = Math.max(0, beatPulse - 0.04);
}

// ── 화면들 ──
type Screen = 'title' | 'select' | 'settings' | 'calib' | 'yt' | 'play' | 'result';
let screen: Screen = 'title';
let cursor = 0;
let t0 = performance.now();

// 곡 고르기 목록: 자체곡 + 유튜브
interface Entry { kind: 'own' | 'yt'; song?: Song; title: string; sub: string; color: string }
function entries(): Entry[] {
  const list: Entry[] = SONGS.map((s) => ({ kind: 'own' as const, song: s, title: s.title, sub: `${s.genre} · BPM ${s.bpm} · ${Math.round((s.beats * 60) / s.bpm)}초`, color: s.color }));
  list.push({ kind: 'yt', title: '유튜브 음악으로 하기', sub: '주소를 넣고 박자를 맞추거나, 직접 채보를 만들어 보세요', color: '#ff5a6e' });
  return list;
}

// ── 게임 진행 ──
interface PNote extends Note { done: boolean; holding: boolean; tailDone: boolean; hitAt: number }
interface Play {
  chart: Chart; notes: PNote[]; tally: Tally; mode: 'own' | 'yt' | 'record';
  song?: Song; ytId?: string; chartId?: string; leadUntil: number; tap: boolean; tapDown: Map<string, number>; title: string; length: number; end: number;
  lastGrade: Grade | null; gradeAt: number; held: boolean[]; flashes: Array<{ lane: number; at: number; g: Grade }>;
  style: Style; bpm: number; tiles: Tile[]; cam: { x: number; y: number; at: number };
  rec: Note[]; recDown: number[]; paused: boolean; jamAt: number; bursts: Array<{ lane: number; at: number; g: Grade }>; diffs: number[]; hitsFx: Array<{ d: number; at: number }>; lastDiff: number; pressAt: number[];
}
let play: Play | null = null;

/** 곡 시각. perfMs를 주면 그 순간(키를 누른 순간)의 곡 시각 */
function clock(perfMs = performance.now()): number {
  if (!play) return 0;
  // 유튜브는 2초 세고 나서 영상을 튼다 (그동안은 음수 시각)
  if (play.mode !== 'own' && play.leadUntil) return -(play.leadUntil - perfMs) / 1000 - set.offset / 1000;
  const raw = play.mode === 'own' ? synth.time(perfMs) : yt.time(perfMs);
  return raw - set.offset / 1000;
}

/** 판의 왼쪽 끝: 자체곡은 왼쪽(오른쪽은 배경 영상), 유튜브는 영상 오른쪽 */
/** 판 모양: 왼쪽 끝, 칸 너비, 판 너비, 판정선 높이, 누르는 칸 높이, 오른쪽 영상 자리 너비.
 *  PC는 예전 그대로, 휴대폰은 판을 가로로 꽉 채우고 아래 누르는 칸을 크게 (유튜브는 오른쪽에 영상 자리) */
interface Geo { x0: number; lw: number; fw: number; hitY: number; padH: number; side: number }
function geo(p: Play): Geo {
  const lanes = p.chart.lanes;
  if (!phone()) { const lw = laneW(lanes); return { x0: 44, lw, fw: lw * lanes, hitY: 440, padH: 54, side: 0 }; }
  const side = p.mode === 'own' ? 0 : Math.round(VW * 0.27);
  const x0 = 12, fw = VW - 24 - (side ? side + 12 : 0);
  return { x0, lw: fw / lanes, fw, hitY: 404, padH: H - 404 - 14, side };
}
function fieldX(p: Play): number { return geo(p).x0; }
/** 판 오른쪽 정보 자리: [x, 너비, 배경 영상 높이] */
function hud(p: Play): [number, number, number] {
  if (!phone()) return [470, 466, 300];
  const hx = fieldX(p) + p.chart.lanes * laneW(p.chart.lanes) + 52;
  const hw = W - hx - 14;
  return [hx, hw, Math.round((hw * 9) / 16)];
}
/** 유튜브 영상 자리 */
function placeYt(x: number, y: number, w: number, h: number): void {
  Object.assign(ytBox.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
}

function keyName(lanes: number, i: number): string { return KEYLABEL[KEYMAPS[lanes][i]] ?? '?'; }

function startOwn(song: Song): void {
  const chart = songChart(song, set.level);
  // 노트가 된 소리는 반주에서 빼고, 칠 때 낸다 (키음)
  const skip = new Set(chart.notes.map((n) => n.ev).filter((e): e is number => e !== undefined));
  synth.resume().then(() => {
    previewId = '';
    synth.play(song, 2.2, { skip });
    play = newPlay(chart, 'own', song.title, (song.beats * 60) / song.bpm);
    play.song = song;
    setStyle(play, set.style, song.bpm);
    screen = 'play';
  });
}

/** 방식 정하기: 궤도는 박자로 길을 만든다 */
function setStyle(p: Play, style: Style, bpm: number): void {
  p.style = style; p.bpm = bpm;
  if (style === 'orbit') { p.tiles = orbitPath(p.chart.notes, bpm, { turns: p.chart.level === 'hard' }); p.cam = { x: 0, y: 0, at: 0 }; }
}
function newPlay(chart: Chart, mode: Play['mode'], title: string, length: number): Play {
  const notes = chart.notes.map((n) => ({ ...n, done: false, holding: false, tailDone: n.len <= 0, hitAt: 0 }));
  const total = notes.length + notes.filter((n) => n.len > 0).length;
  return { chart, notes, tally: newTally(total), style: 'keys', bpm: 120, tiles: [], cam: { x: 0, y: 0, at: 0 }, mode, title, length, end: length + 1.5, lastGrade: null, gradeAt: -9, held: new Array(chart.lanes).fill(false), flashes: [], rec: [], recDown: new Array(chart.lanes).fill(-1), paused: false, jamAt: -9999, bursts: [], leadUntil: 0, tap: false, tapDown: new Map(), diffs: [], hitsFx: [], lastDiff: 0, pressAt: new Array(chart.lanes).fill(-9999) };
}

function judge(p: Play, gr: Grade, lane: number, burst = true, diff: number | null = null): void {
  if (apply(p.tally, gr, set.noFail)) { p.jamAt = performance.now(); sfx.play('switch-a', 0.25); }
  p.lastGrade = gr; p.gradeAt = performance.now();
  p.lastDiff = diff ?? 0;
  if (diff !== null) { p.diffs.push(diff); p.hitsFx.push({ d: diff, at: performance.now() }); if (p.hitsFx.length > 30) p.hitsFx.shift(); }
  if (gr !== 'MISS') { p.flashes.push({ lane, at: performance.now(), g: gr }); if (burst) p.bursts.push({ lane, at: performance.now(), g: gr }); }
}

function press(lane: number, at = performance.now()): void {
  const p = play!;
  const now = clock(Math.min(at, performance.now()));
  p.held[lane] = true;
  p.pressAt[lane] = performance.now();
  if (p.mode === 'record') { p.recDown[lane] = now; hit(); return; }
  // 이 칸에서 가장 이른, 아직 안 친 노트
  let best: PNote | null = null;
  for (const n of p.notes) {
    if (n.done || n.lane !== lane) continue;
    if (n.t - now > WINDOWS.MISS) break;
    best = n; break;
  }
  if (!best) { hit(); return; }
  const gr = grade(now - best.t);
  if (!gr) { hit(); return; }
  best.done = true; best.hitAt = now;
  judge(p, gr, lane, true, gr === 'MISS' ? null : now - best.t);
  if (best.len > 0 && gr !== 'MISS') best.holding = true;
  else if (best.len > 0) { best.tailDone = true; judge(p, 'MISS', lane); }
  if (best.ev !== undefined && p.mode === 'own') synth.keysound(best.ev); // 키음
  else hit();
}
/** 리듬 채보 녹음: 아무 키나 눌렀다 뗀 시각 (0.35초 넘게 누르면 길게) */
function tapDownAt(p: Play, code: string, at: number): void {
  if (p.tapDown.has(code)) return;
  p.tapDown.set(code, clock(Math.min(at, performance.now())));
  p.held.fill(true);
  p.flashes.push({ lane: Math.floor(p.chart.lanes / 2), at: performance.now(), g: 'PERFECT' });
  hit();
}
function tapUp(p: Play, code: string, at = performance.now()): void {
  const down = p.tapDown.get(code);
  if (down === undefined) return;
  p.tapDown.delete(code);
  const now = clock(Math.min(at, performance.now()));
  p.rec.push({ t: down, lane: 0, len: now - down >= 0.35 ? now - down : 0 });
  if (!p.tapDown.size) p.held.fill(false);
}
function hit(): void { synth.tick(set.hitSound, set.hitVol); }

function release(lane: number, at = performance.now()): void {
  const p = play!;
  const now = clock(Math.min(at, performance.now()));
  p.held[lane] = false;
  if (p.mode === 'record') {
    const down = p.recDown[lane];
    if (down >= 0) p.rec.push({ t: down, lane, len: now - down > 0.3 ? now - down : 0 });
    p.recDown[lane] = -1;
    return;
  }
  for (const n of p.notes) {
    if (n.lane === lane && n.holding && !n.tailDone) {
      n.holding = false; n.tailDone = true;
      judge(p, releaseGrade(n.t + n.len - now), lane);
    }
  }
}

function update(): void {
  const p = play;
  if (!p || p.paused || screen !== 'play') return;
  if (p.mode === 'own') synth.pump();
  if (p.leadUntil && performance.now() >= p.leadUntil) { p.leadUntil = 0; yt.play(0); }
  const now = clock();
  if (p.mode !== 'record') {
    for (const n of p.notes) {
      if (!n.done && now - n.t > WINDOWS.MISS) { n.done = true; judge(p, 'MISS', n.lane); if (!n.tailDone) { n.tailDone = true; judge(p, 'MISS', n.lane); } }
      if (n.holding && now >= n.t + n.len) { n.holding = false; n.tailDone = true; judge(p, 'PERFECT', n.lane); }
    }
  }
  if (p.tally.failed || now > p.end || (p.mode !== 'own' && yt.duration() > 0 && now > yt.duration() - 0.3 && !yt.isPlaying())) finish();
}

function finish(): void {
  const p = play!;
  if (p.mode === 'own') synth.stop(); else yt.pause();
  if (p.mode === 'record') {
    // 누르고 있던 건반은 지금 뗀 것으로
    for (let i = 0; i < p.chart.lanes; i++) if (p.recDown[i] >= 0) release(i);
    for (const code of [...p.tapDown.keys()]) tapUp(p, code);
    // 리듬 채보는 칸 없이(0번) 박자만 저장 → 할 때 건반 수·난이도에 맞춰 칸을 정한다
    const notes = p.tap ? cleanRecorded(p.rec, 1) : cleanRecorded(p.rec, p.chart.lanes);
    const v = Lib.find(lib, p.ytId!) ?? Lib.touch(lib, p.ytId!, { title: yt.title(), duration: yt.duration() }, Date.now());
    if (notes.length) {
      const c = Lib.addChart(v, p.tap ? Lib.RHYTHM : p.chart.lanes, notes, Date.now());
      saveLib();
      chartPick = 0;
      ytMsg = `"${c.name}" 저장 (박자 ${notes.length}개). "내 채보로 하기"로 해 보세요.`;
    } else ytMsg = '친 게 없어서 저장하지 않았어요.';
    enterYt(R.mine);
    return;
  }
  const key = p.song ? `${p.song.id}_${p.chart.lanes}_${p.chart.level}` : p.chartId ? `yt_${p.ytId}_${p.chartId}` : `yt_${p.ytId}_${p.chart.lanes}_${p.chart.level}_auto`;
  const old = best[key];
  if (!p.tally.failed && (!old || p.tally.score > old.score)) { best[key] = { score: p.tally.score, rank: rank(p.tally) }; saveJson('yj_best', best); resultNew = true; } else resultNew = false;
  sfx.play('switch-a', 0.5);
  ytBox.style.display = 'none';
  resultMsg = '';
  screen = 'result';
}
let resultNew = false;
let resultMsg = '';

// ── 판(노트가 떨어지는 칸) 그리기: 쇠틀, 흰·파랑 막대 노트, 판정선 불꽃, 잼 게이지 ──
const HIT_Y = 440;
function noteBar(x: number, y: number, w: number, h: number, col: string): void {
  const [hi, mid, lo] = NOTE_GRAD[col] ?? NOTE_GRAD.white;
  const grd = g.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, hi); grd.addColorStop(0.45, mid); grd.addColorStop(1, lo);
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 1, y + 1, w - 2, 1);
}
function metal(x: number, y: number, w: number, h: number): void {
  const grd = g.createLinearGradient(x, 0, x + w, 0);
  grd.addColorStop(0, '#2b2f3f'); grd.addColorStop(0.35, '#7d859f'); grd.addColorStop(0.55, '#4a5068'); grd.addColorStop(1, '#1f2230');
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 1, h);
}
function bolt(x: number, y: number): void {
  g.fillStyle = '#1a1c26'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b8bfd6'; g.beginPath(); g.arc(x - 1, y - 1, 2.5, 0, Math.PI * 2); g.fill();
}
function field(p: Play, x0: number): void {
  const lanes = p.chart.lanes;
  const G = geo(p), ph = phone();
  const lw = G.lw, fw = G.fw, hitY = G.hitY;
  const now = clock();
  const pxs = 260 * set.speed; // 초당 픽셀
  const ms = performance.now();
  // 쇠틀과 검은 판
  if (ph) { metal(x0 - 10, 0, 10, H); metal(x0 + fw, 0, 10, H); }
  else {
    metal(x0 - 16, 0, 16, H); metal(x0 + fw, 0, 34, H);
    for (const by of [40, 200, 360]) { bolt(x0 - 8, by); bolt(x0 + fw + 8, by); }
  }
  g.fillStyle = '#05040b'; g.fillRect(x0, 0, fw, hitY);
  for (let i = 0; i < lanes; i++) {
    const x = x0 + i * lw;
    const col = LANE_COLOR[lanes][i];
    g.fillStyle = col === 'blue' ? 'rgba(40,90,200,0.10)' : col === 'yellow' ? 'rgba(220,170,40,0.08)' : 'rgba(255,255,255,0.035)';
    g.fillRect(x, 0, lw, hitY);
    if (p.held[i]) {
      const grd = g.createLinearGradient(0, hitY, 0, hitY - 300);
      grd.addColorStop(0, HEX[col] + 'bb'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(x, hitY - 300, lw, 300);
    }
    g.fillStyle = 'rgba(120,130,170,0.25)'; g.fillRect(x, 0, 1, hitY);
  }
  // 마디선
  if (p.song) {
    const spb = 60 / p.song.bpm;
    for (const b of p.song.bars ?? []) {
      if (b * spb < now - 0.2) continue;
      if (b * spb > now + 3) break;
      const y = hitY - (b * spb - now) * pxs;
      if (y < 0 || y > hitY) continue;
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x0, y, fw, 1);
    }
  }
  // 노트
  g.save(); g.beginPath(); g.rect(x0, 0, fw, hitY + 6); g.clip();
  for (const n of p.notes) {
    if (n.done && !n.holding) continue;
    const yHead = hitY - (n.t - now) * pxs;
    const yTail = hitY - (n.t + n.len - now) * pxs;
    if (yTail > H + 40) continue;
    if (yHead < -40 && n.len <= 0) break;
    const col = LANE_COLOR[lanes][n.lane];
    const x = x0 + n.lane * lw;
    if (n.len > 0) {
      const top = Math.max(-10, yTail), bot = n.holding ? hitY : yHead;
      const [hi, mid] = NOTE_GRAD[col];
      const grd = g.createLinearGradient(x, 0, x + lw, 0);
      grd.addColorStop(0, mid); grd.addColorStop(0.5, hi); grd.addColorStop(1, mid);
      g.globalAlpha = n.holding ? 0.55 + 0.25 * Math.sin(ms / 40) : 0.45;
      g.fillStyle = grd; g.fillRect(x + 7, top, lw - 14, Math.max(4, bot - top));
      g.globalAlpha = 1;
      noteBar(x + 2, yTail - 6, lw - 4, 10, col);
      if (!n.holding) noteBar(x + 2, yHead - 6, lw - 4, 12, col);
    } else noteBar(x + 2, yHead - 6, lw - 4, 12, col);
  }
  g.restore();
  // 판정선
  const lg = g.createLinearGradient(0, hitY - 6, 0, hitY + 6);
  lg.addColorStop(0, 'rgba(255,80,90,0)'); lg.addColorStop(0.5, 'rgba(255,90,100,0.95)'); lg.addColorStop(1, 'rgba(255,80,90,0)');
  g.fillStyle = lg; g.fillRect(x0, hitY - 6, fw, 12);
  g.fillStyle = '#fff'; g.fillRect(x0, hitY - 1, fw, 2);
  // 건반 받침 (기어)
  if (ph) { metal(x0 - 10, hitY + 6, fw + 20, H - hitY - 6); g.fillStyle = '#12131c'; g.fillRect(x0, hitY + 6, fw, H - hitY - 10); }
  else { metal(x0 - 16, hitY + 6, fw + 50, H - hitY - 6); g.fillStyle = '#12131c'; g.fillRect(x0, hitY + 8, fw, 70); }
  for (let i = 0; i < lanes; i++) {
    const x = x0 + i * lw;
    const col = LANE_COLOR[lanes][i];
    const dn = p.held[i];
    const py = hitY + (ph ? 8 : 12) + (dn ? 3 : 0), pw = lw - (ph ? 4 : 6), pad = G.padH - (dn ? 3 : 0);
    g.globalAlpha = dn ? 1 : 0.7;
    nine(img(`${KEY_SPRITE[col]}_button_square_depth_gloss`), x + (ph ? 2 : 3), py, pw, pad, 14);
    g.globalAlpha = 1;
    if (!ph) text(keyName(lanes, i), x + lw / 2, hitY + 37 + (dn ? 2 : 0), 15, dn ? '#fff' : '#e4e7f5', 'center', 'KFuture');
  }
  // 잼 게이지 (PC는 아래, 휴대폰은 위 띠에)
  const jy = ph ? 30 : hitY + 84;
  const bw = ph ? fw - 96 : fw; // 휴대폰은 오른쪽 위에 멈춤 버튼 자리
  g.fillStyle = '#05040b'; g.fillRect(x0, jy, bw, 12);
  const jg = g.createLinearGradient(x0, 0, x0 + bw, 0);
  jg.addColorStop(0, '#ff4fa8'); jg.addColorStop(0.5, '#ffd75a'); jg.addColorStop(1, '#4fe0ff');
  g.fillStyle = jg; g.fillRect(x0 + 1, jy + 1, (bw - 2) * Math.min(1, p.tally.jam / 100), 10);
  for (let k = 1; k < 10; k++) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x0 + (bw * k) / 10, jy + 1, 1, 10); }
  if (x0 >= 40) text('JAM', x0 - 8, jy + 6, 9, '#ffd75a', 'right', 'KFuture');
  else text('JAM', x0 + 6, jy + 6, 9, '#ffffff', 'left', 'KFuture');
  // 판정선 불꽃
  g.save(); g.globalCompositeOperation = 'lighter';
  p.bursts = p.bursts.filter((f) => ms - f.at < 240);
  // 판정이 좋을수록 크게: PERFECT는 하얀 고리까지
  for (const f of p.bursts) {
    const k = (ms - f.at) / 240, cx = x0 + f.lane * lw + lw / 2;
    const bl = Math.min(lw, 96); // 휴대폰의 넓은 칸에서도 불꽃이 화면을 덮지 않게
    const size = f.g === 'PERFECT' ? bl * 1.15 : f.g === 'GREAT' ? bl * 0.85 : bl * 0.55;
    burst(cx, hitY, k, f.g === 'PERFECT' ? '#ffe36b' : HEX[LANE_COLOR[lanes][f.lane]], size);
    if (f.g === 'PERFECT' && k < 0.6) { g.strokeStyle = `rgba(255,255,255,${0.9 - k * 1.5})`; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, hitY, bl * (0.3 + k), bl * (0.15 + k * 0.4), 0, 0, Math.PI * 2); g.stroke(); }
  }
  // 누른 칸의 판정선이 번쩍 (노트가 없어도)
  for (let i = 0; i < lanes; i++) {
    const k = (ms - p.pressAt[i]) / 120;
    if (k < 1) { g.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; g.fillRect(x0 + i * lw + 2, hitY - 4, lw - 4, 8); }
  }
  for (const n of p.notes) if (n.holding && ms % 90 < 45) burst(x0 + n.lane * lw + lw / 2, hitY, 0.3, HEX[LANE_COLOR[lanes][n.lane]], Math.min(lw, 96) * 0.8);
  g.restore();
  p.flashes = p.flashes.filter((f) => ms - f.at < 200);
  for (const f of p.flashes) {
    const k = (ms - f.at) / 200;
    const sz = 30 + k * 34;
    g.globalAlpha = 1 - k;
    const st = img(f.g === 'PERFECT' ? 'yellow_star' : f.g === 'GREAT' ? 'blue_star' : 'grey_star');
    if (st.complete) g.drawImage(st, x0 + f.lane * lw + lw / 2 - sz / 2, hitY - 30 - k * 30 - sz / 2, sz, sz);
    g.globalAlpha = 1;
  }
  // 체력: PC는 오른쪽 쇠틀 안 세로 막대, 휴대폰은 위 띠의 가로 막대
  if (ph) {
    const seg = 30, sw = bw / seg, lit = Math.ceil((p.tally.life / 100) * seg);
    g.fillStyle = 'rgba(5,4,11,0.85)'; g.fillRect(x0, 0, fw, 29);
    for (let k = 0; k < seg; k++) {
      const on = k < lit;
      g.fillStyle = on ? (k < 6 ? '#ff4f5e' : k < 14 ? '#ffd75a' : '#4fe08a') : '#1b1d28';
      if (on && lit <= 6 && ms % 400 < 200) g.fillStyle = '#ff9aa6';
      g.fillRect(x0 + k * sw + 1, 20, sw - 2, 6);
    }
  } else drawHpBar();
  function drawHpBar(): void {
  const lx = x0 + fw + 12, top = 60, seg = 24, sh = (hitY - top - 20) / seg;
  g.fillStyle = '#05040b'; g.fillRect(lx - 2, top - 2, 14, sh * seg + 4);
  const lit = Math.ceil((p.tally.life / 100) * seg);
  for (let k = 0; k < seg; k++) {
    const on = k < lit;
    const y = top + (seg - 1 - k) * sh;
    g.fillStyle = on ? (k < 5 ? '#ff4f5e' : k < 11 ? '#ffd75a' : '#4fe08a') : '#1b1d28';
    if (on && lit <= 5 && ms % 400 < 200) g.fillStyle = '#ff9aa6';
    g.fillRect(lx, y + 1, 10, sh - 2);
  }
  text('HP', lx + 5, top - 14, 10, '#e4e7f5', 'center', 'KFuture');
  }
  // 판정·콤보·잼
  const cx = x0 + fw / 2;
  const since = (ms - p.gradeAt) / 1000;
  if (p.lastGrade && since < 0.7) {
    const pop = 1 + Math.max(0, 0.12 - since) * 3;
    const col = { PERFECT: '#ffe36b', GREAT: '#6bd0ff', GOOD: '#9cf59c', MISS: '#ff6b7b' }[p.lastGrade];
    text(p.lastGrade, cx, 230, Math.min(30, fw / 9) * pop, col, 'center', 'KFuture');
    if (p.tally.combo >= 2 && p.lastGrade !== 'MISS') text(String(p.tally.combo), cx, 284, 52 * (1 + Math.max(0, 0.1 - since) * 2), '#ffffff', 'center', 'GalmuriB');
    const tm = p.lastGrade !== 'MISS' ? earlyLate(p.lastDiff) : null;
    if (set.meter && tm) text(`${tm} ${p.lastDiff > 0 ? '+' : ''}${Math.round(p.lastDiff * 1000)}ms`, cx, 326, 13, tm === 'FAST' ? '#6bd0ff' : '#ff9a6b', 'center', 'GalmuriB');
  }
  if (set.meter) errorMeter(p, x0, fw, ph ? hitY - 30 : hitY + 70);
  if (p.tally.jamCombo > 0) {
    const js = (ms - p.jamAt) / 1000;
    const pop = js < 0.3 ? 1 + (0.3 - js) * 1.5 : 1;
    text(`JAM x${p.tally.jamCombo}`, cx, 175, 18 * pop, js < 0.3 && ms % 120 < 60 ? '#ffffff' : '#ff8ad0', 'center', 'KFuture');
  }
}
/** 판정 오차 막대: 가운데가 딱 맞음, 왼쪽 일찍·오른쪽 늦게. 최근 친 것들이 눈금으로 남는다 */
function errorMeter(p: Play, x0: number, fw: number, y: number): void {
  const cx = x0 + fw / 2, half = Math.min(fw / 2 - 6, 120);
  const X = (d: number) => cx + Math.max(-1, Math.min(1, d / WINDOWS.GOOD)) * half;
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(cx - half - 2, y, half * 2 + 4, 10);
  g.fillStyle = 'rgba(156,245,156,0.45)'; g.fillRect(X(-WINDOWS.GOOD), y + 3, X(WINDOWS.GOOD) - X(-WINDOWS.GOOD), 4);
  g.fillStyle = 'rgba(107,208,255,0.6)'; g.fillRect(X(-WINDOWS.GREAT), y + 3, X(WINDOWS.GREAT) - X(-WINDOWS.GREAT), 4);
  g.fillStyle = 'rgba(255,227,107,0.85)'; g.fillRect(X(-WINDOWS.PERFECT), y + 3, X(WINDOWS.PERFECT) - X(-WINDOWS.PERFECT), 4);
  g.fillStyle = '#fff'; g.fillRect(cx - 1, y - 1, 2, 12);
  const ms = performance.now();
  for (const h of p.hitsFx) {
    const a = 1 - (ms - h.at) / 3000;
    if (a <= 0) continue;
    g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(X(h.d) - 1, y, 2, 10);
  }
  // 최근 평균 위치 (▼)
  const recent = p.hitsFx.filter((h) => ms - h.at < 3000);
  if (recent.length >= 3) {
    const avg = recent.reduce((s2, h) => s2 + h.d, 0) / recent.length;
    g.fillStyle = '#ff4fa8'; g.beginPath(); g.moveTo(X(avg) - 4, y - 6); g.lineTo(X(avg) + 4, y - 6); g.lineTo(X(avg), y - 1); g.fill();
  }
}

/** 판정선에서 퍼지는 불꽃 */
function burst(x: number, y: number, k: number, col: string, size: number): void {
  const r = size * (0.4 + k * 0.9);
  const a = 1 - k;
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.35, col + 'cc'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(255,255,255,${a * 0.9})`; g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + k;
    const r0 = r * 0.3, r1 = r * (0.8 + (i % 2) * 0.4);
    g.beginPath(); g.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0 * 0.6); g.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1 * 0.6); g.stroke();
  }
}

/** 배경 영상 대신: 박자에 맞춰 움직이는 무대 (소리 막대·격자 바닥·둥근 해) */
function bga(p: Play, x: number, y: number, w: number, h: number): void {
  const s = p.song!;
  const now = clock();
  const spb = 60 / s.bpm;
  const ph = now > 0 ? (now / spb) % 1 : 0;
  const kick = Math.max(0, 1 - ph * 4);
  g.save();
  g.beginPath(); g.roundRect(x, y, w, h, 10); g.clip();
  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#0b0820'); sky.addColorStop(0.6, '#2a1046'); sky.addColorStop(1, '#5a1a4a');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  // 별
  for (let i = 0; i < 40; i++) {
    const sx = x + ((i * 97) % w), sy = y + ((i * 53) % (h * 0.55));
    g.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * ((i * 7 + Math.floor(now * 4)) % 5 === 0 ? 1 : 0.3)})`;
    g.fillRect(sx, sy, 2, 2);
  }
  // 해
  const horizon = y + h * 0.6;
  const sunR = 70 + kick * 8;
  const sun = g.createLinearGradient(0, horizon - sunR, 0, horizon);
  sun.addColorStop(0, '#ffe36b'); sun.addColorStop(1, s.color);
  g.fillStyle = sun; g.beginPath(); g.arc(x + w / 2, horizon, sunR, Math.PI, 0); g.fill();
  g.fillStyle = '#2a1046';
  for (let k = 0; k < 5; k++) g.fillRect(x + w / 2 - sunR, horizon - 10 - k * 13, sunR * 2, 3 + k * 0.6);
  // 격자 바닥
  g.fillStyle = '#12061f'; g.fillRect(x, horizon, w, h);
  g.strokeStyle = s.color; g.globalAlpha = 0.7; g.lineWidth = 1.5;
  for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(x + w / 2 + i * 14, horizon); g.lineTo(x + w / 2 + i * 120, y + h); g.stroke(); }
  for (let k = 0; k < 8; k++) {
    const z = (k + (now > 0 ? (now / spb) % 1 : 0)) / 8;
    const yy = horizon + (y + h - horizon) * z * z;
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
  }
  g.globalAlpha = 1;
  // 소리 막대
  const bars = synth.spectrum(28);
  const bw = w / bars.length;
  bars.forEach((v, i) => {
    const bh = v * h * 0.45;
    const bg = g.createLinearGradient(0, horizon - bh, 0, horizon);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, s.color);
    g.globalAlpha = 0.55;
    g.fillStyle = bg; g.fillRect(x + i * bw + 2, horizon - bh, bw - 4, bh);
  });
  g.globalAlpha = 1;
  // 잼 콤보 오를 때 번쩍
  const js = (performance.now() - p.jamAt) / 1000;
  if (js < 0.25) { g.fillStyle = `rgba(255,255,255,${(0.25 - js) * 1.6})`; g.fillRect(x, y, w, h); }
  g.restore();
  g.strokeStyle = '#3b3460'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, w, h, 10); g.stroke();
}

const LEVEL_KO: Record<Level, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
// ════════════ 망치·궤도 방식 그리기 ════════════
const GRADE_COL: Record<Grade, string> = { PERFECT: '#ffe36b', GREAT: '#6bd0ff', GOOD: '#9cf59c', MISS: '#ff6b7b' };
/** 오른쪽 정보 자리: 제목, 배경 무대 또는 유튜브 영상(늘 보이게), 점수·정확도·진행·잼 게이지 */
function panelX(): [number, number] { const sw = Math.min(phone() ? 360 : 400, Math.round(VW * 0.36)); return [VW - sw - 16, sw]; }
function sidePanel(p: Play, now: number): [number, number] {
  const [sx, sw] = panelX();
  const vh = Math.round((sw * 9) / 16);
  const lv = levelNumber(p.chart, p.length);
  text(fit2(p.title, sw - 10, 18), sx, 24, 18, '#fff', 'left', 'GalmuriB');
  text(fit2(`${STYLE_KO[p.style]} · ${LEVEL_KO[p.chart.level]} · Lv.${lv}${p.song ? ` · BPM ${p.song.bpm}` : ''}`, sw, 12), sx, 46, 12, '#ffd75a');
  if (p.mode === 'own') bga(p, sx, 58, sw, vh); else placeYt(sx, 58, sw, vh);
  const py = 58 + vh + 12;
  nine(img('grey_button_rectangle_depth_flat'), sx, py, sw, 112, 16);
  text('SCORE', sx + 16, py + 22, 11, '#4a4466', 'left', 'KFuture');
  text(String(p.tally.score).padStart(7, '0'), sx + sw - 16, py + 26, 26, '#2a2440', 'right', 'KFuture');
  text(fit2(`정확도 ${accuracy(p.tally).toFixed(1)}%   최대 콤보 ${p.tally.maxCombo}   JAM ${p.tally.jamCombo}`, sw - 32, 12), sx + 16, py + 56, 12, '#2a2440');
  const prog = Math.max(0, Math.min(1, now / p.length));
  g.fillStyle = '#b9bdd3'; g.fillRect(sx + 16, py + 74, sw - 32, 6);
  g.fillStyle = '#ff4fa8'; g.fillRect(sx + 16, py + 74, (sw - 32) * prog, 6);
  // 체력·잼 게이지
  g.fillStyle = '#2a2440'; g.fillRect(sx + 16, py + 88, sw - 32, 10);
  g.fillStyle = p.tally.life > 30 ? '#4fe08a' : '#ff5a6e'; g.fillRect(sx + 17, py + 89, ((sw - 34) / 2) * Math.max(0, p.tally.life) / 100, 8);
  const jg = g.createLinearGradient(sx + sw / 2, 0, sx + sw - 16, 0); jg.addColorStop(0, '#ff4fa8'); jg.addColorStop(1, '#ffd75a');
  g.fillStyle = jg; g.fillRect(sx + sw / 2 + 1, py + 89, ((sw - 34) / 2) * Math.min(1, p.tally.jam / 100), 8);
  text('체력', sx + 18, py + 104, 9, '#4a4466'); text('JAM', sx + sw / 2 + 2, py + 104, 9, '#4a4466', 'left', 'KFuture');
  if (phone() || coarse) { button('Ⅱ', 12, 8, 70, 40, false, 'grey'); hitAct(8, 4, 78, 48, pauseGame); }
  return [sx, sw];
}
/** 판정 글자·콤보 (방식 공통) */
function gradePop(p: Play, x: number, y: number, size = 30): void {
  const ms = performance.now(), since = (ms - p.gradeAt) / 1000;
  if (p.lastGrade && since < 0.7) {
    const pop = 1 + Math.max(0, 0.12 - since) * 3;
    text(p.lastGrade, x, y, size * pop, GRADE_COL[p.lastGrade], 'center', 'KFuture');
    if (p.tally.combo >= 2 && p.lastGrade !== 'MISS') text(String(p.tally.combo), x, y + size * 1.5, size * 1.5, '#ffffff', 'center', 'GalmuriB');
    const tm = p.lastGrade !== 'MISS' && p.lastGrade !== 'PERFECT' ? earlyLate(p.lastDiff) : null;
    if (tm && set.meter) text(tm, x, y - size * 0.9, 12, tm === 'FAST' ? '#6bd0ff' : '#ff9a6b', 'center', 'KFuture');
  }
  if (p.tally.jamCombo > 0) { const js = (ms - p.jamAt) / 1000; text(`JAM x${p.tally.jamCombo}`, x, y - size * 1.8, 16 * (1 + Math.max(0, 0.2 - js) * 2), '#ff8ad0', 'center', 'KFuture'); }
}
function drawStyled(p: Play): void {
  const now = clock();
  background(performance.now() / 1000, p.song ? p.song.color : '#ff5a6e');
  if (p.style === 'hammer') drawHammer(p, now); else drawOrbit(p, now);
  const [sx] = sidePanel(p, now);
  if (now < 0) text(String(Math.ceil(-now)), sx / 2, 150, 64, '#ffd75a', 'center', 'KFuture');
  if (p.paused) pauseOverlay();
}

// ── 망치: 오른쪽에서 벨트를 타고 오는 못을, 모루 위에 왔을 때 내려친다 ──
function hammerArm(px: number, py: number, len: number, ang: number, big: boolean): void {
  g.save(); g.translate(px, py); g.rotate(ang);
  g.fillStyle = '#2a1a14'; g.fillRect(-2, -8, len + 4, 16);
  g.fillStyle = big ? '#b86542' : '#8a5a3c'; g.fillRect(0, -6, len, 12);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, -6, len, 3);
  g.fillStyle = '#e5484d'; g.fillRect(len * 0.08, -6, len * 0.22, 12);
  const hw = big ? 64 : 42, hh = big ? 40 : 24;
  g.fillStyle = '#2a1a14'; g.fillRect(len - hh / 2 - 2, -hw / 2 - 2, hh + 4, hw + 4);
  if (big) {
    g.fillStyle = '#c97a45'; g.fillRect(len - hh / 2, -hw / 2, hh, hw);
    g.fillStyle = '#e8a46b'; g.fillRect(len - hh / 2, -hw / 2, 6, hw);
    g.fillStyle = '#ffd75a'; g.fillRect(len - hh / 2, -hw / 2 + 6, hh, 5); g.fillRect(len - hh / 2, hw / 2 - 11, hh, 5);
  } else {
    g.fillStyle = '#c0cbdc'; g.fillRect(len - hh / 2, -hw / 2, hh, hw);
    g.fillStyle = '#eef2fa'; g.fillRect(len - hh / 2, -hw / 2, 5, hw);
    g.fillStyle = '#8b9bb4'; g.fillRect(len + hh / 2 - 4, -hw / 2, 4, hw);
  }
  g.restore();
}
function drawHammer(p: Play, now: number): void {
  const ph = phone(), ms = performance.now();
  const beltY = ph ? 318 : 380, beltH = 56, hitX = ph ? 170 : 200;
  const pps = 150 * set.speed;                       // 초당 픽셀
  const lastBig = p.bursts.findLast((b) => b.lane === 1);
  const shake = lastBig && ms - lastBig.at < 120 ? Math.sin(ms * 0.9) * 3 : 0;
  const bx = panelX()[0] - 10;                       // 벨트는 오른쪽 정보 자리 밑에서 나온다
  g.save(); g.translate(0, shake);
  g.beginPath(); g.rect(0, 0, bx, H); g.clip();
  // 작업대 (나무)
  g.fillStyle = '#5a3a28'; g.fillRect(0, beltY + beltH, VW, H - beltY - beltH);
  for (let x = 0; x < VW; x += 96) { g.fillStyle = '#4a2e20'; g.fillRect(x, beltY + beltH, 2, H); }
  g.fillStyle = '#7a4f35'; g.fillRect(0, beltY + beltH, VW, 6);
  // 벨트 (움직이는 줄무늬) + 바퀴
  g.fillStyle = '#1c1a26'; g.fillRect(0, beltY, VW, beltH);
  const off = ((now * pps) % 40 + 40) % 40;
  g.fillStyle = '#2c2a3a';
  for (let x = -off; x < VW; x += 40) g.fillRect(x, beltY + 4, 18, beltH - 8);
  g.fillStyle = '#4a4666'; g.fillRect(0, beltY, VW, 3); g.fillRect(0, beltY + beltH - 3, VW, 3);
  // 모루(치는 자리)
  g.fillStyle = 'rgba(255,215,90,0.16)'; g.fillRect(hitX - 30, beltY, 60, beltH);
  g.strokeStyle = '#ffd75a'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(hitX - 30, beltY + 2, 60, beltH - 4); g.setLineDash([]);
  g.fillStyle = '#3a3f52'; g.beginPath(); g.moveTo(hitX - 46, beltY + beltH); g.lineTo(hitX + 46, beltY + beltH); g.lineTo(hitX + 30, beltY + beltH + 20); g.lineTo(hitX + 22, beltY + beltH + 52); g.lineTo(hitX - 22, beltY + beltH + 52); g.lineTo(hitX - 30, beltY + beltH + 20); g.fill();
  g.fillStyle = '#5a6078'; g.fillRect(hitX - 46, beltY + beltH, 92, 5);
  // 못·나사·판자
  const top = beltY + 8;
  for (const n of p.notes) {
    const x = hitX + (n.t - now) * pps;
    if (x > bx + 60) break;
    const xe = hitX + (n.t + n.len - now) * pps;
    if (xe < -60) continue;
    const hitOk = n.done && n.hitAt !== 0;
    const missed = n.done && !hitOk;
    const big = n.lane === 1;
    const drop = missed ? Math.max(0, now - n.t - 0.1) * 380 : 0;
    g.globalAlpha = missed ? Math.max(0, 1 - drop / 160) : 1;
    if (n.len > 0) {
      // 긴 판자: 누르고 있는 동안 리벳이 차례로 박힌다
      const x1 = Math.max(x, -40);
      g.fillStyle = '#2a1a14'; g.fillRect(x1 - 14, top - 14 + drop, xe - x1 + 28, 22);
      g.fillStyle = big ? '#c97a45' : '#9a6a4a'; g.fillRect(x1 - 12, top - 12 + drop, xe - x1 + 24, 18);
      for (let rx = x; rx <= xe; rx += 26) {
        if (rx < -20 || rx > VW + 20) continue;
        const flat = hitOk && rx <= hitX + 2 && (n.holding || n.tailDone);
        g.fillStyle = flat ? '#8b9bb4' : big ? '#ffd75a' : '#e0e6f0';
        g.beginPath(); g.ellipse(rx, top - 12 + drop - (flat ? 0 : 4), 7, flat ? 3 : 6, 0, Math.PI, 0); g.fill();
      }
    }
    if (x < -60) { g.globalAlpha = 1; continue; }
    // 받침 나무토막
    const bw = big ? 46 : 34, bh = big ? 26 : 20;
    g.fillStyle = '#2a1a14'; g.fillRect(x - bw / 2 - 2, top + drop - bh + 14, bw + 4, bh + 4);
    g.fillStyle = big ? '#b86542' : '#c89a6a'; g.fillRect(x - bw / 2, top + drop - bh + 16, bw, bh);
    g.fillStyle = big ? '#ff5a6e' : '#4fb0ff'; g.fillRect(x - bw / 2, top + drop + 12, bw, 4);   // 왼손 파랑 · 오른손 빨강
    text(ph ? (big ? '오' : '왼') : (big ? 'J' : 'F'), x, top + drop - bh / 2 + 18, big ? 13 : 11, 'rgba(42,26,20,0.75)', 'center', 'GalmuriB');
    // 못(작은)·큰 못
    const sink = hitOk ? Math.min(1, (now - n.hitAt) * 14) : 0;
    const nl = (big ? 26 : 20) * (1 - sink * 0.85);
    const hw = big ? 30 : 18, hh = big ? 8 : 5;
    const nx = x, ny = top + drop - bh + 16;
    if (missed) {
      // 휘어진 못
      g.strokeStyle = '#8b9bb4'; g.lineWidth = big ? 6 : 4; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 6, ny - nl * 0.6); g.lineTo(nx + 16, ny - nl * 0.8); g.stroke();
    } else {
      g.fillStyle = '#2a1a14'; g.fillRect(nx - (big ? 4 : 3), ny - nl - 1, big ? 8 : 6, nl + 1);
      g.fillStyle = big ? '#e0a830' : '#c0cbdc'; g.fillRect(nx - (big ? 3 : 2), ny - nl, big ? 6 : 4, nl);
      g.fillStyle = '#2a1a14'; g.fillRect(nx - hw / 2 - 2, ny - nl - hh - 2, hw + 4, hh + 4);
      g.fillStyle = big ? '#ffd75a' : '#eef2fa'; g.fillRect(nx - hw / 2, ny - nl - hh, hw, hh);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(nx - hw / 2, ny - nl - hh, hw, 2);
      if (hitOk && now - n.hitAt < 0.5) { g.globalAlpha = 1 - (now - n.hitAt) * 2; text('★', nx, ny - nl - 26, 16, '#ffe36b', 'center'); }
    }
    g.globalAlpha = 1;
  }
  // 망치 두 자루: 누르는 순간 내려침 (길게 누르는 중엔 덜덜)
  const swing = (lane: number) => {
    const k = (ms - p.pressAt[lane]) / 1000;
    const holding = p.notes.some((n) => n.lane === lane && n.holding);
    if (holding) return 0.12 + Math.abs(Math.sin(ms / 40)) * 0.3;
    if (k < 0.045) return k / 0.045;
    if (k < 0.24) return 1 - (k - 0.045) / 0.195;
    return 0;
  };
  const small = { px: hitX - 140, py: beltY - 168, len: 160 }, large = { px: hitX + 170, py: beltY - 205, len: 205 };
  const aimS = Math.atan2(top - 24 - small.py, hitX - small.px), aimL = Math.atan2(top - 32 - large.py, hitX - large.px);
  const ks = swing(0), kl = swing(1);
  hammerArm(small.px, small.py, small.len, aimS - (1 - ks) * 1.0, false);
  hammerArm(large.px, large.py, large.len, aimL + (1 - kl) * 0.9, true);
  // 손잡이 축
  for (const a of [small, large]) { g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(a.px, a.py, 9, 0, 7); g.fill(); g.fillStyle = '#8b9bb4'; g.beginPath(); g.arc(a.px, a.py, 6, 0, 7); g.fill(); }
  // 불꽃
  for (const b of p.bursts) {
    const k = (ms - b.at) / 340;
    if (k >= 1) continue;
    burst(hitX, top - 6, k, GRADE_COL[b.g], b.lane === 1 ? 90 : 60);
    if (k < 0.5) text(b.lane === 1 ? '쾅!' : '탕!', hitX + (b.lane === 1 ? 40 : -40), top - 70 - k * 30, b.lane === 1 ? 26 : 20, '#ffffff', 'center', 'GalmuriB');
  }
  p.bursts = p.bursts.filter((b) => ms - b.at < 400);
  // 벨트 끝 바퀴
  g.fillStyle = '#0a0818'; g.beginPath(); g.arc(bx - 4, beltY + beltH / 2, beltH / 2 + 4, 0, 7); g.fill();
  g.fillStyle = '#4a4666'; g.beginPath(); g.arc(bx - 4, beltY + beltH / 2, beltH / 2 - 2, 0, 7); g.fill();
  g.save(); g.translate(bx - 4, beltY + beltH / 2); g.rotate(-now * pps / (beltH / 2)); g.fillStyle = '#8b9bb4'; g.fillRect(-3, -beltH / 2 + 4, 6, beltH - 8); g.fillRect(-beltH / 2 + 4, -3, beltH - 8, 6); g.restore();
  g.restore();
  gradePop(p, Math.min(hitX + (ph ? 330 : 300), bx - 120), ph ? 130 : 150);
  if (set.meter && !ph) errorMeter(p, hitX + 60, 300, beltY + beltH + 18);
  // 아래: 키 안내 (휴대폰은 왼쪽·오른쪽 반을 누르는 큰 패드)
  if (ph) {
    const py = beltY + beltH + 24, phh = H - py - 10, half = (VW - 36) / 2;
    [['작은 망치', '#4fb0ff'], ['큰 망치', '#ff5a6e']].forEach(([label, col], i) => {
      const x = 12 + i * (half + 12);
      g.fillStyle = p.held[i] ? col + 'aa' : 'rgba(255,255,255,0.08)'; g.beginPath(); g.roundRect(x, py, half, phh, 18); g.fill();
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(x, py, half, phh, 18); g.stroke();
      text(label, x + half / 2, py + phh / 2, 22, '#fff', 'center', 'GalmuriB');
    });
  } else {
    text('F (A S D) 작은 망치 — 파란 못', 30, H - 40, 14, p.held[0] ? '#4fb0ff' : '#cfd3ea');
    text('J (K L ;) 큰 망치 — 빨간 못 · 판자는 꾹', 30, H - 18, 14, p.held[1] ? '#ff8a8a' : '#cfd3ea');
  }
}

// ── 궤도: 해와 달이 번갈아 축이 되어 돈다. 도는 별이 다음 칸에 닿을 때 누른다 ──
function drawOrbit(p: Play, now: number): void {
  const tiles = p.tiles, ms = performance.now(), ph = phone();
  if (!tiles.length) return;
  const at = orbitAt(tiles, now, p.bpm);
  const areaW = panelX()[0] - 16;
  const Rr = ph ? 66 : 74;
  // 카메라: 축 칸과 도는 별 사이를 부드럽게 따라감
  const tx = (tiles[at.i].x * 0.7 + at.x * 0.3), ty = (tiles[at.i].y * 0.7 + at.y * 0.3);
  const dt = p.cam.at ? Math.min(0.1, (ms - p.cam.at) / 1000) : 1;
  p.cam.at = ms;
  if (dt >= 1 || Math.hypot(p.cam.x - tx, p.cam.y - ty) > 6) { p.cam.x = tx; p.cam.y = ty; }
  else { const k = 1 - Math.exp(-dt * 5); p.cam.x += (tx - p.cam.x) * k; p.cam.y += (ty - p.cam.y) * k; }
  const cx = areaW / 2, cy = H / 2 + 10;
  const X = (x: number) => cx + (x - p.cam.x) * Rr, Y = (y: number) => cy + (y - p.cam.y) * Rr;
  g.save(); g.beginPath(); g.rect(0, 0, areaW, H); g.clip();
  // 박자에 맞춰 숨 쉬는 원
  const beat = now > 0 ? (now / (60 / p.bpm)) % 1 : 0;
  g.strokeStyle = `rgba(255,255,255,${0.06 + (1 - beat) * 0.06})`; g.lineWidth = 2;
  for (let r = 1; r <= 4; r++) { g.beginPath(); g.arc(cx, cy, Rr * r * 1.6 + beat * 10, 0, 7); g.stroke(); }
  // 길
  const from = Math.max(0, at.i - 6), to = Math.min(tiles.length - 1, at.i + 28);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(10,8,24,0.8)'; g.lineWidth = 30; g.beginPath();
  for (let i = from; i <= to; i++) { const t = tiles[i]; if (i === from) g.moveTo(X(t.x), Y(t.y)); else g.lineTo(X(t.x), Y(t.y)); }
  g.stroke();
  g.strokeStyle = 'rgba(207,211,234,0.35)'; g.lineWidth = 18; g.stroke();
  // 칸
  for (let i = to; i >= from; i--) {
    const t = tiles[i], x = X(t.x), y = Y(t.y);
    const ahead = i - at.i;
    const fade = ahead > 18 ? Math.max(0, 1 - (ahead - 18) / 10) : 1;
    g.globalAlpha = fade;
    if (t.auto) { g.fillStyle = 'rgba(207,211,234,0.55)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.globalAlpha = 1; continue; }
    const n = p.notes[t.note];
    const hitOk = n && n.done && n.hitAt !== 0, missed = n && n.done && !hitOk;
    const next = !n.done && p.notes.findIndex((m) => !m.done) === t.note;
    const dir = i > 0 ? Math.atan2(t.y - tiles[i - 1].y, t.x - tiles[i - 1].x) : 0;
    const size = next ? 26 + (1 - beat) * 3 : 22;
    g.save(); g.translate(x, y); g.rotate(dir);
    g.fillStyle = '#0a0818'; g.beginPath(); g.roundRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6, 8); g.fill();
    g.fillStyle = missed ? '#ff5a6e' : hitOk ? '#9cf59c' : next ? '#ffd75a' : i % 2 ? '#bfe0ff' : '#ffe2b0';
    g.beginPath(); g.roundRect(-size / 2, -size / 2, size, size, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-size / 2 + 3, -size / 2 + 3, size - 6, 3);
    g.restore();
    if (t.turn) text('↺', x, y + 1, 18, '#2a2440', 'center', 'GalmuriB');
    g.globalAlpha = 1;
  }
  // 해와 달: 축 별과 도는 별 (칸마다 바뀜)
  const piv = tiles[at.i];
  const pivSun = at.i % 2 === 0;
  const px = X(piv.x), py = Y(piv.y), mx = X(at.x), my = Y(at.y);
  g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, Rr, 0, 7); g.stroke();
  // 도는 별의 꼬리
  const spb = 60 / p.bpm, w = Math.PI / spb;
  for (let k = 1; k <= 8; k++) {
    const a = at.ang - piv.spin * w * (k * 0.025);
    g.fillStyle = pivSun ? `rgba(150,200,255,${0.4 - k * 0.045})` : `rgba(255,190,90,${0.4 - k * 0.045})`;
    g.beginPath(); g.arc(px + Math.cos(a) * Rr, py + Math.sin(a) * Rr, 13 - k, 0, 7); g.fill();
  }
  const star = (x: number, y: number, sun: boolean, r: number) => {
    const glow = g.createRadialGradient(x, y, 2, x, y, r * 2.2);
    glow.addColorStop(0, sun ? 'rgba(255,200,80,0.7)' : 'rgba(150,200,255,0.6)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill();
    if (sun) {
      g.fillStyle = '#ffb02e';
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + ms / 900; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5); g.lineTo(x + Math.cos(a + 0.25) * r * 0.9, y + Math.sin(a + 0.25) * r * 0.9); g.lineTo(x + Math.cos(a - 0.25) * r * 0.9, y + Math.sin(a - 0.25) * r * 0.9); g.fill(); }
      g.fillStyle = '#ffd75a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, 7); g.fill();
    } else {
      g.fillStyle = '#dfe9ff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = '#b6c6ea'; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.2, r * 0.25, 0, 7); g.arc(x - r * 0.35, y + r * 0.3, r * 0.18, 0, 7); g.fill();
    }
  };
  star(px, py, pivSun, 15);
  star(mx, my, !pivSun, 13);
  for (const b of p.bursts) { const k = (ms - b.at) / 320; if (k < 1) burst(px, py, k, GRADE_COL[b.g], 70); }
  p.bursts = p.bursts.filter((b) => ms - b.at < 400);
  g.restore();
  gradePop(p, areaW / 2, 92, 26);
  if (set.meter) errorMeter(p, areaW / 2 - 150, 300, H - 54);
  text(ph ? '화면 아무 데나 톡 — 도는 별이 다음 칸에 닿을 때' : '아무 키나 (Space·F·J…) — 도는 별이 다음 칸에 닿을 때 · ↺ 칸부터 반대로 돌아요', areaW / 2, H - 24, 13, '#cfd3ea', 'center');
}

function drawPlay(): void {
  const p = play!;
  if (p.style !== 'keys') { drawStyled(p); return; }
  const now = clock();
  if (p.song) {
    const spb = 60 / p.song.bpm;
    const ph = (now / spb) % 1;
    if (ph < 0.08 && now > 0) beatPulse = 1;
  }
  background(performance.now() / 1000, p.song ? p.song.color : '#ff5a6e');
  const x0 = fieldX(p);
  field(p, x0);
  const own = p.mode === 'own';
  const ph = phone(), G = geo(p);
  const lv = levelNumber(p.chart, p.length);
  const info = p.mode === 'record' ? (p.tap ? '리듬 녹음' : `${p.chart.lanes}K  녹음`) : `${p.chart.lanes}K  ${LEVEL_KO[p.chart.level]}  Lv.${lv}  ×${set.speed.toFixed(1)}`;
  const c = p.chartId ? Lib.chartsFor(Lib.find(lib, p.ytId!), p.chart.lanes).find((x) => x.id === p.chartId) : undefined;
  const prog = Math.max(0, Math.min(1, now / p.length));
  const rec = p.mode === 'record';
  if (ph) {
    // ── 휴대폰: 판 위쪽 띠에 제목·점수, 오른쪽 위 멈춤. 유튜브는 오른쪽에 영상과 점수 ──
    const right = x0 + G.fw;
    g.fillStyle = '#ff4fa8'; g.fillRect(x0, 44, (G.fw - 96) * prog, 2);
    if (own) text(fit2(`${p.title}  ${info}`, G.fw - 260, 13), x0 + 8, 10, 13, '#fff');
    else text(fit2(rec ? (p.tap ? '● 리듬 녹음 — 노트 자리마다 아무 데나 톡' : '● 녹음 중') : info, G.fw - 260, 12), x0 + 8, 10, 12, rec ? '#ff8a8a' : '#ffd75a');
    text(rec ? `${p.rec.length + p.tapDown.size}` : String(p.tally.score).padStart(7, '0'), right - 104, 11, 15, '#fff', 'right', 'KFuture');
    button(rec ? '■ 저장' : 'Ⅱ', right - 92, 2, 90, 42, false, rec ? 'red' : 'grey');
    hitAct(right - 92, 0, 92, 48, () => (rec ? finish() : pauseGame()));
    if (G.side) {
      const sx = right + 12, sw = G.side, vh = Math.round((sw * 9) / 16);
      placeYt(sx, 10, sw, vh);
      text(fit2(p.title, sw, 14), sx, vh + 26, 14, '#fff', 'left', 'GalmuriB');
      text(fit2(rec ? (p.tap ? '박자만 치면 칸은 자동' : '건반을 직접 쳐서 녹음') : c ? `내 ${c.name}` : '박자 채보', sw, 12), sx, vh + 46, 12, '#cfd3ea');
      nine(img('grey_button_rectangle_depth_flat'), sx, vh + 62, sw, 96, 14);
      text('SCORE', sx + 12, vh + 82, 11, '#4a4466', 'left', 'KFuture');
      text(String(p.tally.score).padStart(7, '0'), sx + sw - 12, vh + 84, 20, '#2a2440', 'right', 'KFuture');
      text(rec ? `${p.tap ? '친 박자' : '친 노트'} ${p.rec.length + p.tapDown.size}` : fit2(`정확도 ${accuracy(p.tally).toFixed(1)}%  콤보 ${p.tally.maxCombo}`, sw - 24, 12), sx + 12, vh + 112, 12, rec ? '#c0303f' : '#2a2440');
      g.fillStyle = '#b9bdd3'; g.fillRect(sx + 12, vh + 132, sw - 24, 6);
      g.fillStyle = '#ff4fa8'; g.fillRect(sx + 12, vh + 132, (sw - 24) * prog, 6);
    }
  } else {
    // ── PC: 오른쪽에 배경 무대(자체곡) 또는 영상(유튜브)과 점수 ──
    const [hx, hw, bh] = hud(p);
    if (own) {
      bga(p, hx, 64, hw, bh);
      text(fit2(p.title, hw - 180, 20), hx, 24, 20, '#fff', 'left', 'GalmuriB');
      text(`${p.song!.artist} · BPM ${p.song!.bpm}`, hx, 48, 12, '#cfd3ea');
    } else {
      placeYt(hx, 64, hw, 262);
      text(fit2(p.title, hw - 160, 16), hx, 24, 16, '#fff', 'left', 'GalmuriB');
      const sub = rec ? (p.tap ? '● 리듬 녹음 중 — 노트가 나올 때마다 아무 키나 · 길게=길게 · Esc 저장' : '● 녹음 중 — 노래에 맞춰 건반을 치세요 · Esc 끝내고 저장') : c ? `유튜브 · 내 ${c.name}` : '유튜브 · 박자 채보';
      text(fit2(sub, hw, 12), hx, 48, 12, rec ? '#ff8a8a' : '#cfd3ea');
    }
    text(info, hx + hw, 24, 13, '#ffd75a', 'right');
    const sy = 392;
    nine(img('grey_button_rectangle_depth_flat'), hx, sy, hw, 120, 16);
    text('SCORE', hx + 20, sy + 26, 12, '#4a4466', 'left', 'KFuture');
    text(String(p.tally.score).padStart(7, '0'), hx + hw - 20, sy + 30, 30, '#2a2440', 'right', 'KFuture');
    if (!rec) text(fit2(`정확도 ${accuracy(p.tally).toFixed(1)}%   최대 콤보 ${p.tally.maxCombo}   JAM ${p.tally.jamCombo}`, hw - 40, 13), hx + 20, sy + 66, 13, '#2a2440');
    g.fillStyle = '#b9bdd3'; g.fillRect(hx + 20, sy + 88, hw - 40, 8);
    g.fillStyle = '#ff4fa8'; g.fillRect(hx + 20, sy + 88, (hw - 40) * prog, 8);
    if (rec) text(`${p.tap ? '친 박자' : '친 노트'} ${p.rec.length + p.tapDown.size}`, hx + 20, sy + 66, 13, '#c0303f');
    if (coarse) {
      button(rec ? '■ 끝내고 저장' : 'Ⅱ 멈춤', W - 150, 20, 130, 36, false, rec ? 'red' : 'grey');
      hitAct(W - 150, 20, 130, 36, () => (rec ? finish() : pauseGame()));
    }
  }
  if (now < 0) text(String(Math.ceil(-now)), x0 + G.fw / 2, 150, 64, '#ffd75a', 'center', 'KFuture');
  if (p.paused) pauseOverlay();
}
function pauseOverlay(): void {
  g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(0, 0, VW, H);
  text('잠깐 멈춤', VW / 2, 140, 32, '#fff', 'center', 'GalmuriB');
  const items: Array<[string, () => void, string]> = [['계속하기 (Enter)', resumeGame, 'blue'], ['그만두기 (Esc)', quitGame, 'red']];
  if (fsOffer()) items.push([isFs() ? '전체 화면 끄기' : '전체 화면', toggleFs, 'grey']);
  items.forEach(([label, act, col], i) => { const y = 190 + i * 76; button(label, VW / 2 - 150, y, 300, 60, false, col); hitAct(VW / 2 - 150, y, 300, 60, act); });
}

function titleItems(): string[] {
  const it = ['곡 고르기', '설정'];
  if (fsOffer()) it.push(isFs() ? '전체 화면 끄기' : isIOS && !fsApi() ? '전체 화면 (아이폰)' : '전체 화면');
  return it;
}
/** 아이폰: 홈 화면에 추가하는 법 */
function drawIosGuide(): void {
  const cx = VW / 2 - OX;
  g.fillStyle = 'rgba(5,4,12,0.82)'; g.fillRect(-OX, 0, VW, H);
  nine(img('grey_button_rectangle_depth_flat'), cx - 300, 70, 600, 400, 18);
  text('아이폰에서 꽉 찬 화면으로 하기', cx, 110, 22, '#2a2440', 'center', 'GalmuriB');
  text('아이폰 사파리는 웹페이지 전체 화면을 지원하지 않아요.', cx, 148, 14, '#4a4466', 'center');
  text('대신 홈 화면에 추가하면 주소창 없이 앱처럼 열려요.', cx, 170, 14, '#4a4466', 'center');
  const steps = ['① 사파리의 공유 버튼(네모에 ↑)을 누르기', '② 목록에서 "홈 화면에 추가" 고르기', '③ 홈 화면에 생긴 유튜잼 아이콘으로 열기', '④ 휴대폰을 가로로 돌리면 끝!'];
  steps.forEach((t, i) => text(t, cx - 230, 222 + i * 40, 17, '#2a2440'));
  button('알겠어요', cx - 100, 396, 200, 52, true);
  hitAct(-OX, 0, VW, H, () => { iosGuide = false; });
}
function drawTitle(): void {
  background(performance.now() / 1000);
  text('유튜잼', W / 2, 150, 72, '#ffd75a', 'center', 'GalmuriB');
  text('YOUTUJAM', W / 2, 205, 22, '#cfd3ea', 'center', 'KFuture');
  const items = titleItems();
  items.forEach((s, i) => { button(s, W / 2 - 120, 260 + i * 66, 240, 54, cursor === i); hitRow(i, W / 2 - 120, 260 + i * 66, 240, 54); });
  text('↑↓ 고르기 · Enter 결정 · 4건반 D F J K · 5건반 D F ␣ J K · 6건반 S D F J K L · 7건반 S D F ␣ J K L', W / 2, 492, 12, '#a9a4c8', 'center');
  text('새 방식: 망치(F·J로 못 박기) · 궤도(해와 달을 따라 아무 키) — 곡 고르기에서 Tab', W / 2, 514, 12, '#ffd75a', 'center');
}

let selTop = 0;
const SEL_SHOW = 5;
const lvCache = new Map<string, Record<Level, number>>();
function levelsOf(song: Song): Record<Level, number> {
  const k = `${song.id}_${set.style}_${set.lanes}`;
  let v = lvCache.get(k);
  if (!v) {
    const sec = (song.beats * 60) / song.bpm;
    v = { easy: levelNumber(songChart(song, 'easy'), sec), normal: levelNumber(songChart(song, 'normal'), sec), hard: levelNumber(songChart(song, 'hard'), sec) };
    lvCache.set(k, v);
  }
  return v;
}
/** 곡 고르기에서 후렴 미리듣기 (끝나면 다시) */
let previewId = '';
function preview(): void {
  if (screen !== 'select') { if (previewId) { previewId = ''; if (!play || screen !== 'play') synth.stop(); } return; }
  const e = entries()[cursor];
  if (!e || !e.song) { if (previewId) { previewId = ''; synth.stop(); } return; }
  if (synth.ctx.state !== 'running') return;
  if (previewId !== e.song.id || !synth.playing()) {
    const from = e.song.preview ?? Math.min(48, Math.floor(e.song.beats / 2));
    synth.play(e.song, 0.25, { from, until: from + 32, volume: 0.55 });
    previewId = e.song.id;
  }
  synth.pump();
}
function drawSelect(): void {
  background(performance.now() / 1000, entries()[cursor]?.color);
  text('곡 고르기', 30, 34, 22, '#fff', 'left', 'GalmuriB');
  button(`${kindLabel()} ▶`, 170, 12, 120, 40, false, set.style === 'keys' ? 'blue' : set.style === 'hammer' ? 'red' : 'yellow');
  hitAct(170, 12, 120, 40, () => key('Tab', true, false));
  text(fit2(`←→ 난이도 · Tab 방식·건반 수 — ${STYLE_DESC[set.style]}`, 560, 12), 304, 33, 12, set.style === 'keys' ? '#a9a4c8' : '#ffd75a');
  backButton();
  const list = entries();
  // 다섯 줄씩 보이고, 고른 줄을 따라 내려간다
  if (cursor < selTop) selTop = cursor;
  if (cursor >= selTop + SEL_SHOW) selTop = cursor - SEL_SHOW + 1;
  selTop = Math.max(0, Math.min(selTop, list.length - SEL_SHOW));
  if (list.length > SEL_SHOW) {
    [['▲', 66, -1], ['▼', 452, 1]].forEach(([a, y, d]) => {
      const can = d === -1 ? selTop > 0 : selTop + SEL_SHOW < list.length;
      g.globalAlpha = can ? 1 : 0.35;
      button(String(a), 908, Number(y), 44, 40, false, 'grey');
      g.globalAlpha = 1;
      if (can) hitAct(904, Number(y) - 4, 52, 48, () => { selTop += Number(d); cursor = Math.max(selTop, Math.min(selTop + SEL_SHOW - 1, cursor)); });
    });
    const th = 410 * (SEL_SHOW / list.length), ty = 112 + (330 - th) * (selTop / Math.max(1, list.length - SEL_SHOW));
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(928, 112, 4, 330);
    g.fillStyle = '#ffd75a'; g.fillRect(928, ty, 4, Math.min(330, th));
  }
  list.forEach((e, i) => {
    if (i < selTop || i >= selTop + SEL_SHOW) return;
    const y = 66 + (i - selTop) * 86;
    const on = i === cursor;
    nine(img(on ? 'yellow_button_rectangle_depth_gloss' : 'grey_button_rectangle_depth_flat'), 60, y, 840, 78, 18);
    hitRow(i, 60, y, 840, 78);
    g.fillStyle = e.color; g.fillRect(76, y + 14, 10, 46);
    text(e.title, 104, y + 28, 22, on ? '#3b2a00' : '#2a2440', 'left', 'GalmuriB');
    text(e.sub, 104, y + 56, 13, on ? '#5a4410' : '#4a4466');
    if (e.song) {
      const b = best[`${e.song.id}_${playLanes()}_${set.level}`];
      if (b) text(`최고 ${b.score} · ${b.rank}`, 880, y + 26, 15, on ? '#3b2a00' : '#2a2440', 'right', 'KFuture');
      const lvs = levelsOf(e.song);
      (['easy', 'normal', 'hard'] as Level[]).forEach((l, k) => {
        const lx = 640 + k * 82, sel = l === set.level;
        hitAct(lx - 2, y + 40, 80, 36, () => { set.level = l; saveJson('yj_settings', set); cursor = i; sfx.play('click-a', 0.3); });
        g.fillStyle = sel ? (on ? '#3b2a00' : '#2a2440') : 'rgba(40,36,64,0.18)';
        g.beginPath(); g.roundRect(lx, y + 46, 76, 22, 6); g.fill();
        text(`${LEVEL_KO[l]} ${lvs[l]}`, lx + 38, y + 57, 12, sel ? '#ffd75a' : on ? '#5a4410' : '#4a4466', 'center');
      });
      if (on && synth.playing()) {
        const bars = synth.spectrum(10);
        bars.forEach((v, k) => { g.fillStyle = '#3b2a00'; g.fillRect(560 + k * 7, y + 66 - v * 30, 5, v * 30); });
      }
    }
  });
  text('Enter 시작 · Esc 뒤로 · 고른 곡의 후렴을 미리 들려줍니다', W / 2, 520, 12, '#a9a4c8', 'center');
}

const SET_ROWS = ['방식 · 건반 수', '난이도', '노트 속도', '판정 맞추기 (ms)', '자동으로 맞추기 (박자에 맞춰 Space)', '타격음', '타격음 크기', '판정 오차 막대 (FAST·SLOW)', '체력 0이 돼도 계속', '휴대폰 모드 (큰 건반·진동)', '진동 (휴대폰 모드)', '돌아가기'];
function drawSettings(): void {
  background(performance.now() / 1000);
  text('설정', 30, 34, 22, '#fff', 'left', 'GalmuriB');
  const vals = [kindLabel(), { easy: '쉬움', normal: '보통', hard: '어려움' }[set.level], `×${set.speed.toFixed(1)}`, `${set.offset > 0 ? '+' : ''}${set.offset}`, '', HIT_KO[set.hitSound], `${Math.round(set.hitVol * 100)}%`, set.meter ? '켬' : '끔', set.noFail ? '켬' : '끔', MOBILE_KO[set.mobile], set.vibrate ? '켬' : '끔', ''];
  SET_ROWS.forEach((r, i) => {
    // 두 줄로 크게 (손가락으로도 누르기 쉽게)
    const col = i < 6 ? 0 : 1, x = 30 + col * 456, y = 66 + (i % 6) * 68, w = 444, h = 58;
    const on = i === cursor;
    nine(img(on ? 'yellow_button_rectangle_depth_gloss' : 'grey_button_rectangle_depth_flat'), x, y, w, h, 16);
    if (vals[i]) hitArrows(i, x, y, w, h, 0.6);
    hitRow(i, x, y, w, h);
    text(fit2(r, vals[i] ? 250 : w - 40, 15), x + 18, y + 26, 15, on ? '#3b2a00' : '#2a2440');
    if (vals[i]) text(`◀ ${vals[i]} ▶`, x + w - 16, y + 26, 15, on ? '#3b2a00' : '#2a2440', 'right');
  });
  backButton();
  text(settingsMsg || '판정 맞추기: 늘 늦게 맞으면 +, 일찍 맞으면 − 쪽으로. 모르겠으면 "자동으로 맞추기"', W / 2, 500, 12, settingsMsg ? '#ffd75a' : '#a9a4c8', 'center');
}

// ── 판정 자동 맞추기: 박자 소리 16번에 맞춰 누르면 버릇(늦게/일찍)을 재서 판정 맞추기에 넣는다 ──
let settingsMsg = '';
const CAL_BPM = 100, CAL_N = 16;
let cal = { spb: 0.6, taps: [] as number[], flash: -9 };
function startCalib(): void {
  synth.resume().then(() => {
    cal = { spb: synth.metronome(CAL_BPM, CAL_N, 1.5), taps: [], flash: -9 };
    screen = 'calib';
  });
}
function calibTap(at: number): void {
  cal.taps.push(synth.time(Math.min(at, performance.now())));
  cal.flash = performance.now();
}
function updateCalib(): void {
  if (screen !== 'calib') return;
  if (synth.time() > CAL_N * cal.spb + 0.4) {
    const beats = Array.from({ length: CAL_N }, (_, i) => i * cal.spb);
    const ms = calibrate(beats, cal.taps);
    if (ms === null) settingsMsg = '누른 횟수가 모자라요. 다시 해 보세요.';
    else { set.offset = Math.max(-300, Math.min(300, ms)); saveJson('yj_settings', set); settingsMsg = `판정 맞추기를 ${ms > 0 ? '+' : ''}${ms}ms로 맞췄어요.`; }
    screen = 'settings';
  }
}
function drawCalib(): void {
  background(performance.now() / 1000, '#4fe08a');
  const t = synth.time();
  const beat = Math.floor(t / cal.spb);
  const ph = t / cal.spb - beat;
  text('판정 자동 맞추기', W / 2, 60, 26, '#fff', 'center', 'GalmuriB');
  text('삑 소리에 맞춰 Space(또는 건반)를 눌러 주세요. 화면 말고 소리에 맞추세요.', W / 2, 100, 15, '#cfd3ea', 'center');
  const r = t >= 0 ? 60 + (1 - Math.min(1, ph * 3)) * 30 : 50;
  g.fillStyle = t >= 0 && ph < 0.15 ? '#ffd75a' : 'rgba(255,255,255,0.15)';
  g.beginPath(); g.arc(W / 2, 270, r, 0, Math.PI * 2); g.fill();
  if (performance.now() - cal.flash < 120) { g.strokeStyle = '#4fe08a'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, 270, 110, 0, Math.PI * 2); g.stroke(); }
  text(t < 0 ? '준비…' : `${Math.min(CAL_N, beat + 1)} / ${CAL_N}`, W / 2, 270, 28, '#2a2440', 'center', 'GalmuriB');
  text(`누른 횟수 ${cal.taps.length}`, W / 2, 420, 16, '#fff', 'center');
  text(coarse ? '가운데 동그라미를 소리에 맞춰 톡톡' : 'Esc 그만두기', W / 2, 505, 12, '#a9a4c8', 'center');
  backButton();
}

// ── 유튜브: 내 영상 목록 (붙여 넣은 영상과 직접 친 채보를 이 브라우저에 저장) ──
const LIB_KEY = 'yj_library';
function loadLibrary(): Lib.Library {
  let l = Lib.emptyLibrary();
  try {
    l = Lib.parse(localStorage.getItem(LIB_KEY));
    // 예전 방식(영상·건반 수마다 채보 하나)으로 저장된 것을 옮긴다
    const old: Array<[string, string]> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (/^yj_(chart|beat)_/.test(k)) old.push([k, localStorage.getItem(k) ?? '']);
    }
    if (old.length) {
      Lib.migrateOld(l, old, Date.now());
      localStorage.setItem(LIB_KEY, JSON.stringify(l));
      for (const [k] of old) localStorage.removeItem(k);
    }
  } catch { /* 저장소를 못 쓰는 브라우저 */ }
  return l;
}
let lib = loadLibrary();
let persistAsked = false;
function saveLib(): void {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); }
  catch { ytMsg = '브라우저 저장 공간이 모자라요. 백업으로 내보낸 뒤 안 쓰는 영상을 지워 주세요.'; }
  // 브라우저가 저장소를 함부로 비우지 않게 부탁 (지원하는 브라우저만)
  if (!persistAsked) { persistAsked = true; navigator.storage?.persist?.().catch(() => {}); }
}
function current(): Lib.Video | undefined { return ytId ? Lib.find(lib, ytId) : undefined; }
/** 고를 수 있는 내 채보: 건반은 그 건반 수(+리듬 채보), 망치·궤도는 아무 채보나 바꿔서 */
function myCharts(v: Lib.Video | undefined): Lib.SavedChart[] {
  if (set.style === 'keys') return Lib.chartsFor(v, set.lanes);
  return v ? [...v.charts].sort((a, b) => b.at - a.at) : [];
}
/** 저장한 채보를 지금 방식의 노트로 */
function notesFrom(c: Lib.SavedChart): Note[] {
  const lanes = playLanes();
  if (set.style === 'orbit') return toOrbit(c.notes, ytBpm, set.level);
  if (c.lanes === Lib.RHYTHM) return arrangeTaps(c.notes, lanes, set.level, c.id);
  return squeeze(c.notes, c.lanes, lanes);
}

let ytMsg = '';
let ytId = '';
let taps: number[] = [];
let ytBpm = 120, ytOffset = 0;
let chartPick = 0;
let libTop = 0;                 // 목록에서 맨 위에 보이는 칸
let armed = '', armedAt = 0;    // 지우기는 두 번 눌러야
const LIB_SHOW = 3;
const YT_ROWS = ['영상 불러오기', '리듬 채보 만들기 (키 하나로 박자만 치기)', '채보 만들기 (건반까지 직접 정해서 치기)', '내 채보로 하기', '방식 · 건반 수', '자동 채보 (BPM으로 대충)', 'BPM (재생 중 T 두드리기)', '첫 박 (재생 중 첫 박에 B)', '돌아가기'];
// 메뉴 번호
const R = { load: 0, tap: 1, rec: 2, mine: 3, lanes: 4, auto: 5, bpm: 6, beat: 7, back: 8 };
// 커서 번호: 0~7 메뉴, 8~ 목록의 영상들, 그 뒤 두 칸은 백업 내보내기·가져오기
function ytCount(): number { return YT_ROWS.length + lib.videos.length + 2; }
function libIndex(c: number): number { return c - YT_ROWS.length; }

// 눌러서 고를 수 있는 자리 (마우스·손가락)
let hits: Array<{ x: number; y: number; w: number; h: number; i: number; act?: () => void }> = [];
function hitRow(i: number, x: number, y: number, w: number, h: number): void { hits.push({ x, y, w, h, i }); }
/** 누르면 바로 이 일을 하는 자리 (먼저 넣은 것이 먼저) */
function hitAct(x: number, y: number, w: number, h: number, act: () => void): void { hits.unshift({ x, y, w, h, i: -1, act }); }
/** ◀ 값 ▶ 줄: 오른쪽 끝 두 칸을 누르면 값이 바뀐다 */
function hitArrows(i: number, x: number, y: number, w: number, h: number, left = 0.62): void {
  const ax = x + w * left, mid = x + w * (left + (1 - left) / 2);
  hitAct(ax, y, mid - ax, h, () => { cursor = i; key('ArrowLeft', true, false); });
  hitAct(mid, y, x + w - mid, h, () => { cursor = i; key('ArrowRight', true, false); });
}
/** 화면 오른쪽 위 "뒤로" (휴대폰엔 Esc가 없으니) */
function backButton(): void {
  button('◀ 뒤로', W - 132, 10, 118, 40, false, 'grey');
  hitAct(W - 132, 10, 118, 40, () => key('Escape', true, false));
}

function fit2(s: string, w: number, size: number, font = 'Galmuri'): string {
  g.font = `${size}px ${font}`;
  if (g.measureText(s).width <= w) return s;
  let t = s;
  while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1);
  return t + '…';
}
function mmss(sec: number): string { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, '0')}`; }

function drawYt(): void {
  background(performance.now() / 1000, '#ff5a6e');
  text('유튜브 음악으로 하기', 24, 30, 20, '#fff', 'left', 'GalmuriB');
  text(`${kindLabel()} · ${LEVEL_KO[set.level]}`, 450, 30, 13, '#ffd75a', 'right');
  const v = current();
  // 제목은 재생해야 알 수 있을 때가 있어서, 알게 되면 목록에도 적어 둔다
  if (v && yt.ready && yt.title() && v.title !== yt.title()) { v.title = yt.title(); if (yt.duration()) v.duration = yt.duration(); saveLib(); }
  const charts = myCharts(v);
  if (chartPick >= charts.length) chartPick = Math.max(0, charts.length - 1);
  YT_ROWS.forEach((r, i) => {
    const y = 100 + i * 41;
    const on = i === cursor;
    const need = i !== R.load && i !== R.lanes && i !== R.back;
    const disabled = (need && !yt.ready) || (i === R.mine && !charts.length);
    g.globalAlpha = disabled ? 0.45 : 1;
    nine(img(on ? 'yellow_button_rectangle_depth_gloss' : 'grey_button_rectangle_depth_flat'), 24, y, 426, 36, 14);
    if (i === R.mine || i === R.lanes || i === R.bpm || i === R.beat) hitArrows(i, 24, y, 426, 36, 0.55);
    hitRow(i, 24, y, 426, 36);
    const dark = on ? '#3b2a00' : '#2a2440';
    let val = '';
    if (i === R.mine) val = charts.length ? `◀ ${charts[chartPick].name} · ${charts[chartPick].notes.length} ▶` : '없음';
    if (i === R.lanes) val = `◀ ${kindLabel()} ▶`;
    if (i === R.bpm) val = `◀ ${ytBpm} ▶`;
    if (i === R.beat) val = `◀ ${ytOffset.toFixed(2)}초 ▶`;
    if (i === R.tap) val = '추천';
    text(fit2(r, val ? 250 : 390, 13), 40, y + 16, 13, dark);
    if (val) text(val, 436, y + 16, 13, i === R.tap ? (on ? '#b0306a' : '#d0407a') : dark, 'right');
    g.globalAlpha = 1;
  });
  // 오른쪽: 영상 자리
  if (yt.ready) hitAct(470, 64, 466, 262, () => key('Space', true, false)); // 영상을 누르면 재생/멈춤
  if (!yt.ready) {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.roundRect(470, 64, 466, 262, 8); g.fill();
    text('▶ 영상이 여기에 나옵니다', 703, 180, 16, '#cfd3ea', 'center');
    text('주소를 붙여 넣거나, 아래 목록에서 고르세요', 703, 208, 12, '#8f89b0', 'center');
  }
  // 오른쪽 아래: 내 영상 목록
  const list = Lib.sorted(lib);
  text(`내 영상 목록 (${list.length})`, 470, 344, 14, '#fff', 'left', 'GalmuriB');
  text('이 브라우저에 저장돼요', 936, 344, 11, '#a9a4c8', 'right');
  if (list.length > LIB_SHOW) {
    ['▲', '▼'].forEach((a, k) => {
      const bx = 668 + k * 44;
      button(a, bx, 330, 38, 26, false, 'grey');
      hitAct(bx, 330, 38, 26, () => { libTop = Math.max(0, Math.min(list.length - LIB_SHOW, libTop + (k ? 1 : -1))); const c = YT_ROWS.length + libTop + (k ? LIB_SHOW - 1 : 0); cursor = c; });
    });
  }
  const li = libIndex(cursor);
  if (li >= 0 && li < list.length) { if (li < libTop) libTop = li; if (li >= libTop + LIB_SHOW) libTop = li - LIB_SHOW + 1; }
  libTop = Math.max(0, Math.min(libTop, Math.max(0, list.length - LIB_SHOW)));
  if (!list.length) text('아직 없어요. 영상을 불러오면 여기 쌓입니다.', 470, 378, 12, '#a9a4c8');
  for (let k = 0; k < Math.min(LIB_SHOW, list.length); k++) {
    const idx = libTop + k, it = list[idx];
    const ci = YT_ROWS.length + idx;
    const y = 358 + k * 38, on = cursor === ci;
    nine(img(on ? 'yellow_button_rectangle_depth_gloss' : 'grey_button_rectangle_depth_flat'), 470, y, 466, 34, 14);
    // ✕: 두 번 누르면 목록에서 지움
    hitAct(896, y, 40, 34, () => { cursor = ci; key('Delete', true, false); });
    hitRow(ci, 470, y, 466, 34);
    const dark = on ? '#3b2a00' : '#2a2440';
    const n = it.charts.length;
    text((it.id === ytId ? '▶ ' : '') + fit2(it.title, 280, 13), 484, y + 15, 13, dark);
    text(`채보 ${n}개${it.duration ? ' · ' + mmss(it.duration) : ''}`, 884, y + 15, 12, dark, 'right');
    text('✕', 916, y + 15, 14, armed === 'v' + it.id ? '#d0304a' : dark, 'center');
  }
  if (list.length > LIB_SHOW) text(`${libTop + 1}–${Math.min(list.length, libTop + LIB_SHOW)} / ${list.length}`, 936, 474, 10, '#a9a4c8', 'right');
  const bi = YT_ROWS.length + list.length;
  ['백업 파일로 내보내기', '백업 파일 가져오기'].forEach((r, k) => {
    const x = 470 + k * 236, on = cursor === bi + k;
    nine(img(on ? 'yellow_button_rectangle_depth_gloss' : 'grey_button_rectangle_depth_flat'), x, 482, 230, 30, 12);
    hitRow(bi + k, x, 482, 230, 30);
    text(r, x + 115, 496, 12, on ? '#3b2a00' : '#2a2440', 'center');
  });
  if (ytMsg) text(fit2(ytMsg, 426, 12), 24, 486, 12, '#ffd75a');
  text(coarse ? '영상을 누르면 재생/멈춤 · ◀▶를 눌러 값 바꾸기 · ✕ 두 번 지우기' : 'Enter 결정 · ←→ 바꾸기 · Space 재생/멈춤 · Delete 지우기(두 번) · Esc 뒤로', 24, 522, 11, '#a9a4c8');
  backButton();
}

/** 유튜브 화면으로 (영상·주소 칸 보이기) */
function enterYt(c = 0): void {
  screen = 'yt'; cursor = c;
  placeYt(470 + Math.round((VW - W) / 2), 64, 466, 262);
  form.style.display = 'block';
  ytBox.style.display = yt.ready ? 'block' : 'none';
}

function drawResult(): void {
  const p = play!;
  background(performance.now() / 1000, p.song?.color);
  const r = rank(p.tally);
  text(p.title, W / 2, 50, 22, '#fff', 'center', 'GalmuriB');
  text(`${p.style === 'keys' ? `${p.chart.lanes}건반` : STYLE_KO[p.style]} · ${LEVEL_KO[p.chart.level]}`, W / 2, 78, 13, '#ffd75a', 'center');
  text(r, 260, 250, 140, r === 'F' ? '#ff6b7b' : r.startsWith('S') ? '#ffe36b' : '#6bd0ff', 'center', 'KFuture');
  if (p.tally.failed) text('체력이 다 떨어졌어요', 260, 360, 18, '#ff9aa6', 'center');
  if (resultNew) text('새 최고 기록!', 260, 360, 20, '#ffe36b', 'center');
  const rows: Array<[string, string, string]> = [
    ['점수', String(p.tally.score), '#fff'], ['정확도', `${accuracy(p.tally).toFixed(2)}%`, '#fff'], ['최대 콤보', String(p.tally.maxCombo), '#fff'],
    ['PERFECT', String(p.tally.counts.PERFECT), '#ffe36b'], ['GREAT', String(p.tally.counts.GREAT), '#6bd0ff'], ['GOOD', String(p.tally.counts.GOOD), '#9cf59c'], ['MISS', String(p.tally.counts.MISS), '#ff6b7b'],
  ];
  nine(img('grey_button_rectangle_depth_flat'), 470, 100, 420, 340, 18);
  rows.forEach(([k, v, c], i) => {
    text(k, 500, 135 + i * 44, 18, '#2a2440', 'left', i > 2 ? 'KFuture' : 'GalmuriB');
    text(v, 860, 135 + i * 44, 22, c === '#fff' ? '#2a2440' : c, 'right', 'KFuture');
  });
  const off = typicalOffsetMs(p.diffs);
  if (off !== null && p.mode !== 'record') {
    const msg = Math.abs(off) < 8 ? `타이밍이 잘 맞았어요 (평균 ${off > 0 ? '+' : ''}${off}ms)` : `평균 ${Math.abs(off)}ms ${off > 0 ? '늦게' : '일찍'} 쳤어요 · O 누르면 판정 맞추기에 반영`;
    text(resultMsg || msg, 260, 410, 13, resultMsg ? '#9cf59c' : '#cfd3ea', 'center');
  }
  const bs: Array<[string, string, string]> = [['다시 하기 (Enter)', 'Enter', 'blue'], ['곡 고르기 (Esc)', 'Escape', 'grey']];
  bs.forEach(([label, k, col], i) => { const x = W / 2 - 250 + i * 260; button(label, x, 468, 240, 56, false, col); hitAct(x, 468, 240, 56, () => key(k, true, false)); });
}

// ── 입력 ──
function laneOf(code: string): number {
  if (play && play.style === 'hammer') return hammerLane(code);
  if (play && play.style === 'orbit') return orbitKey(code) ? 0 : -1;
  const keys = KEYMAPS[play ? play.chart.lanes : set.lanes];
  return keys.indexOf(code);
}

function cycle<T>(arr: T[], v: T, d: number): T { return arr[(arr.indexOf(v) + d + arr.length) % arr.length]; }

async function ytLoad(idArg?: string): Promise<void> {
  const id = idArg ?? youtubeId(urlIn.value);
  if (!id) { ytMsg = '주소를 알아보지 못했어요. https://youtu.be/... 같은 주소를 넣어 주세요.'; return; }
  ytMsg = '불러오는 중…';
  ytBox.style.display = 'block';
  urlIn.value = `https://youtu.be/${id}`;
  try {
    await yt.open(id, ytBox);
    if (yt.error) { ytMsg = yt.error; return; }
    ytId = id;
    const known = Lib.find(lib, id);
    const v = Lib.touch(lib, id, { title: yt.title(), duration: yt.duration() }, Date.now());
    ytBpm = v.bpm; ytOffset = v.offset; chartPick = 0; libTop = 0;
    saveLib();
    const n = Lib.chartsFor(v, set.lanes).length;
    ytMsg = known ? `다시 불러왔어요. ${set.lanes}건반 채보 ${n}개.` : '불러왔어요. "채보 만들기"로 직접 쳐서 채보를 만들어 보세요.';
  } catch (e) {
    ytMsg = String((e as Error).message || e);
  }
}

function saveBeat(): void {
  const v = current();
  if (v) { v.bpm = ytBpm; v.offset = ytOffset; saveLib(); }
}

let lastYtMode: 'auto' | 'mine' = 'auto';
let lastChartId = '';
function ytStart(mode: 'auto' | 'record' | 'tap' | 'mine', chartId?: string): void {
  if (!yt.ready || yt.error || !ytId) { ytMsg = '먼저 영상을 불러와 주세요.'; return; }
  saveBeat();
  const dur = yt.duration();
  let chart: Chart;
  let cid: string | undefined;
  if (mode === 'mine') {
    const charts = myCharts(current());
    const c = (chartId && charts.find((x) => x.id === chartId)) || charts[chartPick];
    if (!c) { ytMsg = `${kindLabel()}으로 할 채보가 없어요. "채보 만들기"로 먼저 만들어 주세요.`; return; }
    chart = { notes: notesFrom(c), lanes: playLanes(), level: set.level };
    cid = c.id; lastChartId = c.id;
  } else if (mode === 'record' || mode === 'tap') chart = { notes: [], lanes: set.lanes, level: set.level };
  else {
    chart = fromBeat(ytBpm, ytOffset, dur, playLanes(), set.level, ytId);
    if (set.style === 'orbit') chart = { ...chart, notes: toOrbit(chart.notes, ytBpm, set.level) };
  }
  if (mode === 'auto' || mode === 'mine') lastYtMode = mode;
  play = newPlay(chart, mode === 'record' || mode === 'tap' ? 'record' : 'yt', yt.title() || '유튜브 영상', dur);
  play.tap = mode === 'tap';
  play.ytId = ytId;
  // 녹음은 늘 건반 판에서
  setStyle(play, mode === 'record' || mode === 'tap' ? 'keys' : set.style, ytBpm);
  play.chartId = cid;
  play.end = dur + 1;
  form.style.display = 'none';
  ytBox.style.display = 'block';
  yt.pause();
  yt.player?.seekTo(0, true);
  play.leadUntil = performance.now() + 2000;
  screen = 'play';
}

/** 두 번 눌러야 지워지게 */
function confirmDel(tag: string, what: string): boolean {
  const now = performance.now();
  if (armed === tag && now - armedAt < 3000) { armed = ''; return true; }
  armed = tag; armedAt = now;
  ytMsg = `${what} — 지우려면 한 번 더 누르세요.`;
  return false;
}

function exportLib(): void {
  const blob = new Blob([JSON.stringify(lib, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `youtujam-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  const charts = lib.videos.reduce((n, v) => n + v.charts.length, 0);
  ytMsg = `영상 ${lib.videos.length}개, 채보 ${charts}개를 파일로 내보냈어요.`;
}
fileIn.addEventListener('change', async () => {
  const f = fileIn.files?.[0];
  fileIn.value = '';
  if (!f) return;
  const inc = Lib.parse(await f.text());
  if (!inc.videos.length) { ytMsg = '유튜잼 백업 파일이 아니거나 비어 있어요.'; return; }
  const added = Lib.merge(lib, inc);
  saveLib();
  ytMsg = `가져왔어요: 새 채보 ${added}개 (영상 ${inc.videos.length}개 확인).`;
});
// 주소 칸을 누르지 않고 붙여 넣어도 바로 불러오기
window.addEventListener('paste', (e) => {
  if (screen !== 'yt' || document.activeElement === urlIn) return;
  const t = e.clipboardData?.getData('text') ?? '';
  const id = youtubeId(t);
  if (id) { e.preventDefault(); urlIn.value = t; ytLoad(id); }
});

let pausedAt = 0;
function pauseGame(): void {
  const p = play; if (!p || p.paused) return;
  p.paused = true; pausedAt = performance.now();
  if (p.mode === 'own') synth.ctx.suspend(); else yt.pause();
}
function resumeGame(): void {
  const p = play; if (!p || !p.paused) return;
  p.paused = false;
  if (p.mode === 'own') synth.ctx.resume();
  else if (p.leadUntil) p.leadUntil += performance.now() - pausedAt; // 세는 중이었으면 이어서 세기
  else yt.player?.playVideo();
}
function quitGame(): void {
  const p = play; if (!p) return;
  p.paused = false;
  if (p.mode === 'own') { synth.stop(); screen = 'select'; synth.ctx.resume(); } else { yt.pause(); enterYt(R.mine); }
}
function key(code: string, down: boolean, repeat: boolean, at = performance.now()): void {
  if (iosGuide) { if (down && (code === 'Enter' || code === 'Escape')) iosGuide = false; return; }
  if (screen === 'calib') {
    if (down && !repeat && code === 'Escape') { synth.stop(); screen = 'settings'; settingsMsg = ''; return; }
    if (down && !repeat && (code === 'Space' || KEYMAPS[set.lanes].includes(code))) calibTap(at);
    return;
  }
  if (screen === 'play' && play) {
    if (code === 'Escape' && down) {
      if (play.mode === 'record') { finish(); return; }
      if (!play.paused) pauseGame(); else quitGame();
      return;
    }
    if (play.paused) {
      if (code === 'Enter' && down) resumeGame();
      return;
    }
    if (play.tap) { if (!repeat) { if (down) tapDownAt(play, code, at); else tapUp(play, code, at); } return; }
    const lane = laneOf(code);
    if (lane >= 0 && !repeat) (down ? press : release)(lane, at);
    return;
  }
  if (!down) return;
  const ok = code === 'Enter' || code === 'NumpadEnter';
  const back = code === 'Escape';
  const up = code === 'ArrowUp', dn = code === 'ArrowDown', lf = code === 'ArrowLeft', rt = code === 'ArrowRight';
  const moveSfx = () => sfx.play('click-a', 0.3);
  switch (screen) {
    case 'title':
      const tn = titleItems().length;
      if (up) { cursor = (cursor + tn - 1) % tn; moveSfx(); }
      if (dn) { cursor = (cursor + 1) % tn; moveSfx(); }
      if (ok) {
        synth.resume();
        if (cursor === 2) { toggleFs(); break; }
        sfx.play('switch-a'); screen = cursor === 0 ? 'select' : 'settings'; cursor = 0;
      }
      break;
    case 'select': {
      const n = entries().length;
      if (up) { cursor = (cursor - 1 + n) % n; moveSfx(); }
      if (dn) { cursor = (cursor + 1) % n; moveSfx(); }
      if (lf || rt) { set.level = cycle<Level>(['easy', 'normal', 'hard'], set.level, rt ? 1 : -1); saveJson('yj_settings', set); moveSfx(); }
      if (code === 'Tab') { cycleKind(1); moveSfx(); }
      if (back) { screen = 'title'; cursor = 0; }
      if (ok) {
        const e = entries()[cursor];
        sfx.play('switch-a');
        if (e.kind === 'own' && e.song) startOwn(e.song);
        else enterYt(0);
      }
      break;
    }
    case 'settings': {
      if (up) { cursor = (cursor - 1 + SET_ROWS.length) % SET_ROWS.length; moveSfx(); }
      if (dn) { cursor = (cursor + 1) % SET_ROWS.length; moveSfx(); }
      const d = rt ? 1 : lf ? -1 : 0;
      if (d) {
        if (cursor === 0) cycleKind(d);
        if (cursor === 1) set.level = cycle<Level>(['easy', 'normal', 'hard'], set.level, d);
        if (cursor === 2) set.speed = Math.max(1, Math.min(6, Math.round((set.speed + d * 0.5) * 10) / 10));
        if (cursor === 3) set.offset = Math.max(-300, Math.min(300, set.offset + d * 10));
        if (cursor === 5) set.hitSound = cycle(HIT_SOUNDS, set.hitSound, d);
        if (cursor === 6) set.hitVol = Math.max(0.2, Math.min(1, Math.round((set.hitVol + d * 0.2) * 10) / 10));
        if (cursor === 7) set.meter = !set.meter;
        if (cursor === 8) set.noFail = !set.noFail;
        if (cursor === 9) { set.mobile = cycle(MOBILE, set.mobile, d); setTimeout(fit, 0); }
        if (cursor === 10) { set.vibrate = !set.vibrate; if (set.vibrate) navigator.vibrate?.(30); }
        saveJson('yj_settings', set);
        if (cursor === 5 || cursor === 6) synth.resume().then(() => synth.tick(set.hitSound, set.hitVol)); // 들어 보기
        else moveSfx();
      }
      if (ok && (cursor === 5 || cursor === 6)) synth.resume().then(() => synth.tick(set.hitSound, set.hitVol));
      if (ok && cursor === 4) startCalib();
      if (ok && cursor >= 7 && cursor <= 10) key('ArrowRight', true, false);
      if (back || (ok && cursor === 11)) { screen = 'title'; cursor = 1; settingsMsg = ''; }
      break;
    }
    case 'yt': {
      if (document.activeElement === urlIn) {
        if (ok) { urlIn.blur(); ytLoad(); }
        if (back) urlIn.blur();
        return;
      }
      const n = ytCount();
      if (up) { cursor = (cursor - 1 + n) % n; moveSfx(); }
      if (dn) { cursor = (cursor + 1) % n; moveSfx(); }
      if (code === 'Space' && yt.ready) { if (yt.isPlaying()) yt.pause(); else yt.player.playVideo(); }
      if (code === 'KeyT' && yt.isPlaying()) {
        taps.push(yt.time()); taps = taps.slice(-16);
        const b = tapBpm(taps); if (b) { ytBpm = b; ytMsg = `두드린 박자: BPM ${b}`; saveBeat(); }
      }
      if (code === 'KeyB' && yt.isPlaying()) { ytOffset = Math.round(yt.time() * 100) / 100; ytMsg = `첫 박 위치: ${ytOffset}초`; saveBeat(); }
      if (code === 'Tab') { cycleKind(1); chartPick = 0; moveSfx(); }
      const d = rt ? 1 : lf ? -1 : 0;
      const charts = myCharts(current());
      if (d && cursor === R.mine && charts.length) { chartPick = (chartPick + d + charts.length) % charts.length; moveSfx(); }
      if (d && cursor === R.lanes) { cycleKind(d); chartPick = 0; moveSfx(); }
      if (d && cursor === R.bpm) { ytBpm = Math.max(40, Math.min(260, Math.round((ytBpm + d) * 10) / 10)); saveBeat(); }
      if (d && cursor === R.beat) { ytOffset = Math.max(0, Math.round((ytOffset + d * 0.02) * 100) / 100); saveBeat(); }
      const list = Lib.sorted(lib);
      const li = libIndex(cursor);
      if (code === 'Delete' || code === 'Backspace') {
        if (cursor === R.mine && charts[chartPick]) {
          const c = charts[chartPick];
          if (confirmDel('c' + c.id, `"${c.name}" 지우기`)) { Lib.removeChart(current()!, c.id); saveLib(); chartPick = 0; ytMsg = `"${c.name}"을 지웠어요.`; }
        } else if (li >= 0 && li < list.length) {
          const v = list[li];
          if (confirmDel('v' + v.id, `"${fit2(v.title, 160, 12)}"와 채보 ${v.charts.length}개 지우기`)) { Lib.removeVideo(lib, v.id); saveLib(); ytMsg = '목록에서 지웠어요.'; cursor = Math.min(cursor, ytCount() - 1); }
        }
      }
      if (ok) {
        if (cursor === R.load) { if (urlIn.value.trim() && youtubeId(urlIn.value) !== ytId) ytLoad(); else urlIn.focus(); }
        if (cursor === R.tap) ytStart('tap');
        if (cursor === R.rec) ytStart('record');
        if (cursor === R.mine) ytStart('mine');
        if (cursor === R.auto) ytStart('auto');
        if (cursor === R.back) back2select();
        if (li >= 0 && li < list.length) { if (list[li].id !== ytId || !yt.ready) ytLoad(list[li].id); else ytMsg = '지금 불러온 영상이에요.'; }
        if (li === list.length) exportLib();
        if (li === list.length + 1) fileIn.click();
      }
      if (back) back2select();
      break;
    }
    case 'result':
      if (code === 'KeyO' && play && !resultMsg) {
        const off = typicalOffsetMs(play.diffs);
        if (off !== null && Math.abs(off) >= 8) {
          set.offset = Math.max(-300, Math.min(300, set.offset + off)); saveJson('yj_settings', set);
          resultMsg = `판정 맞추기를 ${set.offset > 0 ? '+' : ''}${set.offset}ms로 바꿨어요.`; sfx.play('switch-a', 0.4);
        }
      }
      if (ok && play) { if (play.song) startOwn(play.song); else ytStart(lastYtMode, lastChartId); }
      if (back) { if (play && !play.song) enterYt(R.mine); else back2select(); }
      break;
  }
}

function back2select(): void {
  yt.pause();
  ytBox.style.display = 'none';
  form.style.display = 'none';
  screen = 'select';
  cursor = entries().length - 1;
}

window.addEventListener('keydown', (e) => {
  if (document.activeElement === urlIn && !['Enter', 'Escape', 'NumpadEnter'].includes(e.code)) return;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  key(e.code, true, e.repeat, e.timeStamp);
});
window.addEventListener('keyup', (e) => key(e.code, false, false, e.timeStamp));

// 손가락: 판 위를 누르면 그 칸
function lanesX(p: Play): [number, number] { const G = geo(p); return [G.x0, G.lw]; }
const touchLane = new Map<number, number>();
function pos(e: PointerEvent): [number, number] {
  const r = cv.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * VW - OX, ((e.clientY - r.top) / r.height) * H];
}
function hitAt(x: number, y: number) { return hits.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); }
let downHit: { id: number; x: number; y: number } | null = null;
cv.addEventListener('pointerdown', (e) => {
  const [x, y] = pos(e);
  // 하는 중: 누르는 즉시 (손가락을 떼기 전에) 판정
  if (screen === 'play' && play && !play.paused) {
    const h = hitAt(x, y);
    if (h && h.act) { downHit = { id: e.pointerId, x, y }; return; }
    if (play.tap) { tapDownAt(play, 'p' + e.pointerId, e.timeStamp); buzz(10); return; }
    const [x0, lw] = lanesX(play);
    const lane = play.style === 'hammer' ? (x < VW / 2 - OX ? 0 : 1) : play.style === 'orbit' ? 0 : Math.floor((x - x0) / lw);
    if (lane >= 0 && lane < play.chart.lanes) { touchLane.set(e.pointerId, lane); press(lane, e.timeStamp); buzz(12); }
    return;
  }
  if (screen === 'calib') { calibTap(e.timeStamp); buzz(10); return; }
  // 메뉴는 손가락을 뗄 때 (휴대폰 브라우저는 그때만 소리·전체 화면을 허락한다)
  downHit = { id: e.pointerId, x, y };
});
function liftLane(e: PointerEvent): void {
  if (screen === 'play' && play && play.tap) { tapUp(play, 'p' + e.pointerId, e.timeStamp); return; }
  const lane = touchLane.get(e.pointerId);
  if (lane !== undefined && play) { release(lane, e.timeStamp); touchLane.delete(e.pointerId); }
}
cv.addEventListener('pointerup', (e) => {
  synth.resume();
  liftLane(e);
  if (!downHit || downHit.id !== e.pointerId) return;
  downHit = null;
  const [x, y] = pos(e);
  const h = hitAt(x, y);
  if (!h) return;
  if (h.act) h.act(); else { cursor = h.i; key('Enter', true, false); }
});
cv.addEventListener('pointercancel', (e) => { liftLane(e); downHit = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('wheel', (e) => {
  if (screen !== 'select' && screen !== 'yt' && screen !== 'settings') return;
  e.preventDefault();
  key(e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp', true, false);
}, { passive: false });

// ── 반복 ──
function frame(): void {
  hits = [];
  update();
  updateCalib();
  preview();
  // 하는 중 화면은 넓어진 폭(VW)을 다 쓰고, 메뉴는 960 폭을 가운데에
  OX = screen === 'play' ? 0 : Math.round((VW - W) / 2);
  g.setTransform(SX, 0, 0, SY, 0, 0);
  if (OX) g.translate(OX, 0);
  form.style.left = `${24 + OX}px`;
  switch (screen) {
    case 'title': drawTitle(); break;
    case 'select': drawSelect(); break;
    case 'settings': drawSettings(); break;
    case 'calib': drawCalib(); break;
    case 'yt': drawYt(); break;
    case 'play': drawPlay(); break;
    case 'result': drawResult(); break;
  }
  if (iosGuide) drawIosGuide();
  if (performance.now() - toastAt < 4000) {
    const tcx = VW / 2 - OX;
    g.font = '14px Galmuri'; const tw = Math.min(VW - 40, g.measureText(toast).width + 40);
    g.fillStyle = 'rgba(10,8,20,0.92)'; g.beginPath(); g.roundRect(tcx - tw / 2, H - 60, tw, 40, 10); g.fill();
    text(fit2(toast, tw - 30, 14), tcx, H - 40, 14, '#ffd75a', 'center');
  }
  requestAnimationFrame(frame);
}
document.fonts.load('16px Galmuri').finally(() => requestAnimationFrame(frame));

// 개발용: 주소에 ?dev=<장면> 이면 정해진 장면으로 (화면 확인용)
const dev = new URLSearchParams(location.search).get('dev');
if (dev) {
  (window as any).__yj = { set, startOwn, songs: SONGS, go: (s: Screen) => { screen = s; }, get play() { return play; }, get screen() { return screen; }, key, clock, synth };
}
