// 곡 데이터: 박자 단위 이벤트. 소리(synth)와 채보(chart)가 같은 데이터를 쓰므로 박자가 정확히 맞는다.

export type Part = 'lead' | 'bass' | 'kick' | 'snare' | 'hat' | 'pad' | 'arp';
export interface Ev { t: number; part: Part; pitch: number; dur: number; vel: number }
export interface Song {
  id: string; title: string; artist: string; bpm: number; genre: string;
  lead: 'saw' | 'square' | 'triangle'; color: string; events: Ev[]; beats: number;
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

/** "E5:1 G5:.5 -:1" 같은 글을 (음, 길이) 목록으로. "-"는 쉼 */
export function parse(txt: string): Array<[number | null, number]> {
  return txt.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    return [n === '-' ? null : midi(n), Number(d)];
  });
}

export function length(seq: Array<[number | null, number]>): number {
  return seq.reduce((a, [, d]) => a + d, 0);
}

interface Section { bars: number; melody: string; chords: string[][]; drums: string; arp?: boolean }

/** 절·후렴 묶음으로 곡을 만든다. drums: 16칸 한 마디 (k 킥, s 스네어, h 하이햇, K 킥+스네어, . 쉼) */
export function build(sections: Section[]): { events: Ev[]; beats: number } {
  const ev: Ev[] = [];
  let bar0 = 0;
  for (const sec of sections) {
    const t0 = bar0 * 4;
    let t = t0;
    const mel = parse(sec.melody);
    const total = sec.bars * 4;
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
      const at = t0 + b * 4;
      for (let k = 0; k < 8; k++) ev.push({ t: at + k / 2, part: 'bass', pitch: ch[0] + (k % 4 === 3 ? 12 : 0), dur: 0.45, vel: k % 2 ? 0.8 : 1 });
      ev.push({ t: at, part: 'pad', pitch: ch[1], dur: 4, vel: 1 });
      ev.push({ t: at, part: 'pad', pitch: ch[2], dur: 4, vel: 1 });
      if (ch[3] !== undefined) ev.push({ t: at, part: 'pad', pitch: ch[3], dur: 4, vel: 1 });
      if (sec.arp) for (let k = 0; k < 16; k++) ev.push({ t: at + k / 4, part: 'arp', pitch: ch[1 + (k % 3)] + 12, dur: 0.2, vel: 0.7 });
      for (let k = 0; k < 16; k++) {
        const c = sec.drums[k % sec.drums.length];
        const tt = at + k / 4;
        if (c === 'k' || c === 'K') ev.push({ t: tt, part: 'kick', pitch: 0, dur: 0.2, vel: 1 });
        if (c === 's' || c === 'K') ev.push({ t: tt, part: 'snare', pitch: 0, dur: 0.2, vel: 1 });
        if (c === 'h') ev.push({ t: tt, part: 'hat', pitch: 0, dur: 0.05, vel: 1 });
      }
    }
    bar0 += sec.bars;
  }
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, beats: bar0 * 4 };
}
