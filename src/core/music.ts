// 곡 데이터: 박자 단위 이벤트. 소리(synth)와 채보(chart)가 같은 데이터를 쓰므로 박자가 정확히 맞는다.

export type Part = 'lead' | 'bass' | 'kick' | 'snare' | 'hat' | 'pad' | 'arp' | 'keys';
export interface Ev { t: number; part: Part; pitch: number; dur: number; vel: number }
export interface Song {
  id: string; title: string; artist: string; bpm: number; genre: string;
  lead: 'saw' | 'square' | 'triangle' | 'piano' | 'flute'; color: string; events: Ev[]; beats: number;
  /** 곡 고르기에서 미리 들려줄 곳 (박). 없으면 곡 가운데쯤 */
  preview?: number;
  /** 마디가 시작하는 박들 (판의 마디선) */
  bars?: number[];
}

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" → MIDI 번호 */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('음 이름이 이상함: ' + name);
  let n = NAMES[m[1]];
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return (Number(m[3]) + 1) * 12 + n;
}

export function freq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** "E5:1 G5:.5 A5:1/3 -:1" 같은 글을 (음, 길이) 목록으로. "-"는 쉼, 길이는 분수도 된다(셋잇단) */
export function parse(txt: string): Array<[number | null, number]> {
  return txt.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    const len = d.includes('/') ? Number(d.split('/')[0]) / Number(d.split('/')[1]) : Number(d);
    if (!(len > 0)) throw new Error('길이가 이상함: ' + tok);
    return [n === '-' ? null : midi(n), len];
  });
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** MIDI 번호 → "C#5" */
export function noteName(m: number): string { return SHARP[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
/** 멜로디 글 전체를 n 반음 옮긴다 (전조·옥타브) */
export function transpose(mel: string, n: number): string {
  return mel.trim().split(/\s+/).map((tok) => {
    const [x, d] = tok.split(':');
    return x === '-' ? tok : `${noteName(midi(x) + n)}:${d}`;
  }).join(' ');
}

export function length(seq: Array<[number | null, number]>): number {
  return seq.reduce((a, [, d]) => a + d, 0);
}

interface Section {
  bars: number; melody: string; chords: string[][];
  /** 한 마디를 16칸(또는 12칸=셋잇단)으로. 비우면 드럼 없음 */
  drums: string; arp?: boolean;
  /** 반주: band(베이스 8분+패드, 기본) / broken3(피아노 셋잇단 펼침화음) / broken8(피아노 8분 펼침화음) / march(왼손 쿵-짝) */
  acc?: 'band' | 'broken3' | 'broken8' | 'march';
  /** 한 마디의 박 수 (기본 4, 볼레로 같은 3박자는 3) */
  meter?: number;
}

/** 절·후렴 묶음으로 곡을 만든다. drums: 16칸 한 마디 (k 킥, s 스네어, h 하이햇, K 킥+스네어, . 쉼) */
export function build(sections: Section[]): { events: Ev[]; beats: number; bars: number[] } {
  const ev: Ev[] = [];
  const bars: number[] = [];
  let beat0 = 0;
  for (const sec of sections) {
    const bpb = sec.meter ?? 4;
    const t0 = beat0;
    let t = t0;
    const mel = parse(sec.melody);
    const total = sec.bars * bpb;
    let loopT = 0;
    // 멜로디가 짧으면 구역 끝까지 되풀이
    while (loopT < total - 1e-6) {
      for (const [p, d] of mel) {
        if (loopT >= total - 1e-6) break;
        if (p !== null) ev.push({ t: t0 + loopT, part: 'lead', pitch: p, dur: d, vel: 1 });
        loopT += d;
      }
      if (length(mel) === 0) break;
    }
    t = t0;
    for (let b = 0; b < sec.bars; b++) {
      const ch = sec.chords[b % sec.chords.length].map(midi);
      const at = t0 + b * bpb;
      bars.push(at);
      const acc = sec.acc ?? 'band';
      // 피아노 반주: 마디 첫 박 베이스만 vel 1 (어려움 채보에서 왼손 노트로 쓴다)
      const keys = (t: number, p: number, d: number, v: number) => ev.push({ t, part: 'keys', pitch: p, dur: d, vel: v });
      if (acc === 'band') {
        for (let k = 0; k < bpb * 2; k++) ev.push({ t: at + k / 2, part: 'bass', pitch: ch[0] + (k % 4 === 3 ? 12 : 0), dur: 0.45, vel: k % 2 ? 0.8 : 1 });
        ev.push({ t: at, part: 'pad', pitch: ch[1], dur: bpb, vel: 1 });
        ev.push({ t: at, part: 'pad', pitch: ch[2], dur: bpb, vel: 1 });
        if (ch[3] !== undefined) ev.push({ t: at, part: 'pad', pitch: ch[3], dur: bpb, vel: 1 });
      } else if (acc === 'broken3') {
        const up = [ch[0], ch[1], ch[2], ch[3] ?? ch[1] + 12, ch[2], ch[1]];
        for (let k = 0; k < bpb * 3; k++) keys(at + k / 3, up[k % 6], 0.6, k === 0 ? 1 : 0.7);
      } else if (acc === 'broken8') {
        const up = [ch[0], ch[2], ch[1], ch[3] ?? ch[2]];
        for (let k = 0; k < bpb * 2; k++) keys(at + k / 2, up[k % 4], 0.45, k === 0 ? 1 : 0.7);
      } else if (acc === 'march') {
        for (let k = 0; k < bpb * 2; k++) {
          if (k % 2 === 0) keys(at + k / 2, k % 4 === 2 ? ch[0] + 7 : ch[0], 0.4, k === 0 ? 1 : 0.8); // 쿵(으뜸음·딸림음 번갈아)-짝
          else for (const p of ch.slice(1)) keys(at + k / 2, p, 0.3, 0.6);
        }
      }
      if (sec.arp) for (let k = 0; k < bpb * 4; k++) ev.push({ t: at + k / 4, part: 'arp', pitch: ch[1 + (k % 3)] + 12, dur: 0.2, vel: 0.7 });
      const steps = sec.drums.length;
      for (let k = 0; k < steps; k++) {
        const c = sec.drums[k];
        const tt = at + (k * bpb) / steps;
        if (c === 'k' || c === 'K') ev.push({ t: tt, part: 'kick', pitch: 0, dur: 0.2, vel: 1 });
        if (c === 's' || c === 'K') ev.push({ t: tt, part: 'snare', pitch: 0, dur: 0.2, vel: 1 });
        if (c === 'h') ev.push({ t: tt, part: 'hat', pitch: 0, dur: 0.05, vel: 1 });
      }
    }
    beat0 += sec.bars * bpb;
  }
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, beats: beat0, bars };
}
