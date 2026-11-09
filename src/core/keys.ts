// 건반 배치
export const KEYMAPS: Record<number, string[]> = {
  4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
  6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
  7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
};
export const KEYLABEL: Record<string, string> = { KeyS: 'S', KeyD: 'D', KeyF: 'F', Space: '␣', KeyJ: 'J', KeyK: 'K', KeyL: 'L' };

/** 유튜브 주소에서 영상 id */
export function youtubeId(url: string): string | null {
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/.exec(s);
  return m ? m[1] : null;
}

/** 두드린 간격으로 BPM 추정 */
export function tapBpm(times: number[]): number | null {
  if (times.length < 4) return null;
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
  gaps.sort((a, b) => a - b);
  const mid = gaps[Math.floor(gaps.length / 2)];
  const good = gaps.filter((g) => Math.abs(g - mid) < mid * 0.25);
  const avg = good.reduce((a, b) => a + b, 0) / good.length;
  let bpm = 60 / avg;
  while (bpm < 70) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

/** 판정 맞추기: 박자 시각들과 누른 시각들의 차이 중앙값(ms). 너무 엉뚱한 누름은 뺀다 */
export function calibrate(beats: number[], taps: number[]): number | null {
  const diffs: number[] = [];
  for (const t of taps) {
    let best = Infinity;
    for (const b of beats) if (Math.abs(t - b) < Math.abs(best)) best = t - b;
    if (Math.abs(best) < 0.25) diffs.push(best);
  }
  if (diffs.length < 4) return null;
  diffs.sort((a, b) => a - b);
  return Math.round(diffs[Math.floor(diffs.length / 2)] * 1000);
}
