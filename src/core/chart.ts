// 채보: 곡 이벤트에서 떨어질 노트를 만든다. 4건반/7건반, 쉬움·보통·어려움.
import type { Song, Ev } from './music.ts';

export interface Note { t: number; lane: number; len: number; ev?: number }   // t, len: 초 (len>0이면 길게 누르기). ev: 칠 때 나는 곡 소리(곡 이벤트 번호)
export type Level = 'easy' | 'normal' | 'hard';
export interface Chart { notes: Note[]; lanes: number; level: Level }

export function beatSec(bpm: number): number { return 60 / bpm; }

/** 음 높이를 건반 칸으로. 같은 칸이 너무 빨리 겹치지 않게 옆 칸으로 비킨다. */
export function fromSong(song: Song, lanes: number, level: Level): Chart {
  const spb = beatSec(song.bpm);
  const lead = song.events.filter((e) => e.part === 'lead');
  const lo = Math.min(...lead.map((e) => e.pitch)), hi = Math.max(...lead.map((e) => e.pitch));
  const pick: Ev[] = [];
  const index = new Map<Ev, number>();
  song.events.forEach((e, i) => index.set(e, i));
  // 드럼이 없는 곡(클래식): 어려움에서는 피아노 왼손의 마디 첫 음(vel 1)을 노트로 더한다
  const drumless = !song.events.some((e) => e.part === 'kick');
  for (const e of song.events) {
    if (e.part === 'keys') { if (drumless && level === 'hard' && e.vel >= 1) pick.push(e); continue; }
    if (e.part === 'lead') {
      if (level === 'easy' && Math.abs(e.t * 2 - Math.round(e.t * 2)) > 1e-6) continue; // 반 박에 걸친 것만
      pick.push(e);
    } else if (e.part === 'kick' && level !== 'easy') {
      if (level === 'normal' && e.t % 1 !== 0) continue;
      pick.push(e);
    } else if (e.part === 'snare' && level === 'hard') pick.push(e);
  }
  pick.sort((a, b) => a.t - b.t);
  const notes: Note[] = [];
  const lastAt = new Array(lanes).fill(-99);
  const busyUntil = new Array(lanes).fill(-99);
  for (const e of pick) {
    let lane: number;
    if (e.part === 'lead') lane = Math.round(((e.pitch - lo) / Math.max(1, hi - lo)) * (lanes - 1));
    else if (e.part === 'kick' || e.part === 'keys') lane = lanes === 7 ? 3 : 0;
    else lane = lanes === 7 ? 6 : lanes - 1;
    const t = e.t * spb;
    // 같은 때 같은 칸이면 버림, 너무 가까우면 옆 칸
    for (let k = 0; k < lanes; k++) {
      const cand = (lane + (k % 2 ? (k + 1) / 2 : -k / 2) + lanes * 4) % lanes;
      if (t - lastAt[cand] > spb * 0.24 && t > busyUntil[cand]) { lane = cand; break; }
      if (k === lanes - 1) lane = -1;
    }
    if (lane < 0) continue;
    if (notes.some((n) => Math.abs(n.t - t) < 1e-6 && n.lane === lane)) continue;
    const long = e.part === 'lead' && e.dur >= (level === 'easy' ? 2 : 1.5) ? e.dur * spb * 0.85 : 0;
    notes.push({ t, lane, len: long, ev: index.get(e) });
    lastAt[lane] = t;
    busyUntil[lane] = t + long;
  }
  // 한 때에 누르는 건반 수 제한 (쉬움 1, 보통 2, 어려움 3)
  const maxChord = level === 'easy' ? 1 : level === 'normal' ? 2 : 3;
  const out: Note[] = [];
  for (const n of notes) {
    const same = out.filter((o) => Math.abs(o.t - n.t) < 0.01).length;
    if (same < maxChord) out.push(n);
  }
  return { notes: out, lanes, level };
}

/** 난이도 숫자(Lv): 초당 노트 수와 동시에 누르는 정도로 */
export function levelNumber(chart: Chart, seconds: number): number {
  if (!chart.notes.length || seconds <= 0) return 1;
  const nps = chart.notes.length / seconds;
  let chords = 0;
  for (let i = 1; i < chart.notes.length; i++) if (Math.abs(chart.notes[i].t - chart.notes[i - 1].t) < 0.01) chords++;
  const lv = nps * 1.6 + (chords / chart.notes.length) * 6 + (chart.lanes - 4) * 0.6;
  return Math.max(1, Math.min(30, Math.round(lv)));
}

/** 유튜브처럼 소리를 분석할 수 없는 곡: BPM과 시작 위치로 박자에 맞춘 무늬를 만든다 (영상 id로 고정된 난수). */
export function fromBeat(bpm: number, offset: number, duration: number, lanes: number, level: Level, seed: string): Chart {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const spb = beatSec(bpm);
  const step = level === 'easy' ? 1 : level === 'normal' ? 0.5 : 0.25;
  const notes: Note[] = [];
  let lane = Math.floor(rnd() * lanes);
  for (let b = 0; offset + b * spb < duration - 1; b += step) {
    const t = offset + b * spb;
    const bar = Math.floor(b / 4);
    if (bar < 2) continue;                      // 처음 두 마디는 쉼
    const strong = Math.abs(b - Math.round(b)) < 1e-6;
    const keep = strong ? 0.92 : level === 'hard' ? 0.55 : 0.45;
    if (rnd() > keep) continue;
    lane = (lane + 1 + Math.floor(rnd() * (lanes - 1))) % lanes;
    const long = strong && rnd() < 0.08 ? spb * (level === 'easy' ? 2 : 1) : 0;
    notes.push({ t, lane, len: long });
    if (b % 4 === 0 && level !== 'easy' && rnd() < 0.3) notes.push({ t, lane: (lane + Math.floor(lanes / 2)) % lanes, len: 0 });
    if (long) b += Math.max(step, long / spb) - step;
  }
  return { notes: notes.sort((a, b) => a.t - b.t), lanes, level };
}

/** 직접 친 채보 정리: 너무 가까운 같은 칸은 합치고 시간순으로 */
export function cleanRecorded(notes: Note[], lanes: number): Note[] {
  const out: Note[] = [];
  for (const n of [...notes].sort((a, b) => a.t - b.t)) {
    if (n.lane < 0 || n.lane >= lanes) continue;
    const prev = out.findLast((o) => o.lane === n.lane);
    if (prev && n.t - prev.t < 0.06) continue;
    out.push({ t: Math.round(n.t * 1000) / 1000, lane: n.lane, len: n.len > 0.25 ? Math.round(n.len * 1000) / 1000 : 0 });
  }
  return out;
}

/** 리듬 채보: 키 하나로 친 박자(시각·길이)를 그대로 두고 건반 칸을 자동으로 정한다.
 *  - 빠르게 이어지면 계단(끝에서 되돌아옴), 느리면 왼손·오른손을 번갈아 고르게
 *  - 같은 칸 연타(잭)는 피하고, 길게 누르는 동안 그 칸은 비워 둠
 *  - 쉬움: 아주 빠른 연타는 하나 걸러, 보통·어려움: 여유 있는 곳에 동시 누르기를 더함
 *  같은 seed면 늘 같은 결과 (채보 id를 씀) */
export function arrangeTaps(taps: Note[], lanes: number, level: Level, seed: string): Note[] {
  let h = 2166136261;
  for (const ch of seed + lanes + level) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  // 정리: 시간순, 30ms 안에 겹친 건 하나로
  const src: Note[] = [];
  for (const n of [...taps].filter((n) => Number.isFinite(n.t)).sort((a, b) => a.t - b.t)) {
    const last = src[src.length - 1];
    if (last && n.t - last.t < 0.03) { last.len = Math.max(last.len, n.len); continue; }
    src.push({ t: n.t, lane: 0, len: n.len > 0 ? n.len : 0 });
  }
  // 쉬움: 0.2초보다 빠른 연타는 하나 걸러
  const seq = level === 'easy' ? src.filter((n, i) => i === 0 || n.t - src[i - 1].t >= 0.2 || i % 2 === 0) : src;
  const out: Note[] = [];
  const busy = new Array(lanes).fill(-1);       // 이 시각까지 길게 누르는 중
  const lastAt = new Array(lanes).fill(-99);
  const mid = (lanes - 1) / 2;
  let prev = Math.floor(rnd() * lanes), dir = rnd() < 0.5 ? 1 : -1;
  const free = (l: number, t: number) => l >= 0 && l < lanes && busy[l] < t - 0.04;
  for (let i = 0; i < seq.length; i++) {
    const n = seq[i];
    const gapPrev = i ? n.t - seq[i - 1].t : 9;
    const gapNext = i < seq.length - 1 ? seq[i + 1].t - n.t : 9;
    let lane = -1;
    if (gapPrev < 0.22) {
      // 빠른 흐름: 계단, 막히면 방향을 바꿔 되돌아옴
      for (const d of [dir, -dir]) { if (free(prev + d, n.t)) { lane = prev + d; dir = d; break; } }
    } else {
      // 느린 곳: 지난번과 반대쪽 손을 조금 더 자주, 같은 칸은 피함
      const prevSide = prev < mid ? -1 : prev > mid ? 1 : 0;
      const want = rnd() < 0.65 ? -prevSide : prevSide;
      const cand: number[] = [];
      for (let l = 0; l < lanes; l++) if (l !== prev && free(l, n.t)) cand.push(l);
      const good = cand.filter((l) => want === 0 || Math.sign(l - mid) === want || l === mid);
      const pool = good.length ? good : cand;
      if (pool.length) lane = pool[Math.floor(rnd() * pool.length)];
    }
    if (lane < 0) for (let l = 0; l < lanes; l++) if (free(l, n.t) && (l !== prev || gapPrev > 0.3)) { lane = l; break; }
    if (lane < 0) continue; // 모든 칸이 길게 누르는 중
    const len = n.len >= 0.35 ? n.len : 0;
    out.push({ t: n.t, lane, len });
    busy[lane] = n.t + len; lastAt[lane] = n.t;
    prev = lane;
    // 동시 누르기: 앞뒤로 여유가 있을 때만
    const room = level === 'hard' ? 0.3 : 0.45;
    const chance = level === 'hard' ? 0.45 : level === 'normal' ? 0.22 : 0;
    if (len === 0 && gapPrev >= room && gapNext >= room && rnd() < chance) {
      const extra = level === 'hard' && lanes >= 6 && gapNext >= 0.6 && rnd() < 0.3 ? 2 : 1;
      const used = [lane];
      for (let k = 0; k < extra; k++) {
        const opts: number[] = [];
        for (let l = 0; l < lanes; l++) if (!used.includes(l) && free(l, n.t) && used.every((u) => Math.abs(u - l) >= 2 || lanes <= 4)) opts.push(l);
        if (!opts.length) break;
        const l = opts[Math.floor(rnd() * opts.length)];
        out.push({ t: n.t, lane: l, len: 0 }); used.push(l); lastAt[l] = n.t;
      }
    }
  }
  return out.sort((a, b) => a.t - b.t || a.lane - b.lane);
}
