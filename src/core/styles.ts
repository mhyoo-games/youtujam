// 게임 방식: 건반(노트가 떨어짐) · 망치(벨트 위 못을 박자에 맞춰 내려침) · 궤도(해와 달이 번갈아 돌며 길을 따라감)
// 채보·판정은 셋 다 같은 것을 쓰고, 방식마다 칸 수·입력·그림만 다르다.
import type { Note, Level } from './chart.ts';

export type Style = 'keys' | 'hammer' | 'orbit';
export const STYLES: Style[] = ['keys', 'hammer', 'orbit'];
export const STYLE_KO: Record<Style, string> = { keys: '건반', hammer: '망치', orbit: '궤도' };
export const STYLE_DESC: Record<Style, string> = {
  keys: '떨어지는 노트를 건반으로',
  hammer: '벨트 위 못을 망치로 쾅! (F 작은 망치 · J 큰 망치)',
  orbit: '해와 달이 번갈아 돌아요. 길 위 칸에 닿을 때 아무 키나',
};

/** 방식마다 칸 수 (건반은 설정한 건반 수) */
export function lanesFor(style: Style, keyLanes: number): number {
  return style === 'hammer' ? 2 : style === 'orbit' ? 1 : keyLanes;
}

// ── 망치 ──
// 왼손 = 작은 망치(0번, 작은 못), 오른손 = 큰 망치(1번, 큰 못)
const HAMMER: Record<string, number> = { KeyA: 0, KeyS: 0, KeyD: 0, KeyF: 0, KeyJ: 1, KeyK: 1, KeyL: 1, Semicolon: 1, Space: 1 };
export function hammerLane(code: string): number { return HAMMER[code] ?? -1; }

/** 다른 칸 수로 만든 채보(직접 친 4건반 채보 등)를 망치 2줄로: 왼쪽 절반은 작은 못, 오른쪽은 큰 못 */
export function squeeze(notes: Note[], fromLanes: number, toLanes: number): Note[] {
  if (fromLanes === toLanes) return notes.map((n) => ({ ...n }));
  const out: Note[] = [];
  for (const n of notes) {
    const lane = Math.min(toLanes - 1, Math.floor((n.lane / fromLanes) * toLanes));
    if (out.some((o) => o.lane === lane && Math.abs(o.t - n.t) < 0.06)) continue;
    out.push({ ...n, lane });
  }
  return out.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

// ── 궤도 ──
/** 궤도에서 누를 수 있는 키: 메뉴용 키를 뺀 아무 키 */
const NOT_ORBIT = new Set(['Escape', 'Enter', 'NumpadEnter', 'Tab', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight']);
export function orbitKey(code: string): boolean { return !NOT_ORBIT.has(code); }

/** 한 줄로 합치고, 길게 누르기는 없애고, 너무 가까운 노트는 합친다 (쉬움 반 박, 보통 ¼박, 어려움 ⅕박) */
export function toOrbit(notes: Note[], bpm: number, level: Level): Note[] {
  const spb = 60 / bpm;
  const gap = (level === 'easy' ? 0.5 : level === 'normal' ? 0.25 : 0.2) * spb - 1e-6;
  const out: Note[] = [];
  for (const n of [...notes].sort((a, b) => a.t - b.t)) {
    const last = out[out.length - 1];
    if (last && n.t - last.t < gap) continue;
    out.push({ t: n.t, lane: 0, len: 0, ev: n.ev });
  }
  return out;
}

/** 길 위의 칸. 해·달 중 도는 쪽이 이 칸에 닿는 순간이 t.
 *  auto: 박자가 길게 비어 저절로 지나가는 칸 (누르지 않음). note: 노트 번호(auto는 -1)
 *  ang: 이 칸에서 앞 칸 쪽을 가리키는 각도(도는 별이 여기서 출발). spin: 이 칸부터 도는 방향 */
export interface Tile { x: number; y: number; t: number; auto: boolean; note: number; ang: number; spin: 1 | -1; turn: boolean }

/** 한 박에 반 바퀴(π). 칸 사이 간격 1 */
export const ORBIT_SPEED = Math.PI;
/** 이만큼 넘게 비면 한 박마다 저절로 지나가는 칸을 넣는다 (길이 겹쳐 꼬이지 않게) */
export const ORBIT_MAX_GAP = 1.5;

export function orbitPath(notes: Note[], bpm: number, opts: { turns?: boolean } = {}): Tile[] {
  const spb = 60 / bpm, w = ORBIT_SPEED / spb;
  const first = notes.length ? notes[0].t : 0;
  const tiles: Tile[] = [{ x: 0, y: 0, t: first - spb, auto: true, note: -1, ang: Math.PI, spin: 1, turn: false }];
  const stops: Array<{ t: number; note: number }> = [];
  let prev = tiles[0].t;
  notes.forEach((n, i) => {
    while (n.t - prev > ORBIT_MAX_GAP * spb + 1e-6) { prev += spb; stops.push({ t: prev, note: -1 }); }
    stops.push({ t: n.t, note: i }); prev = n.t;
  });
  let spin: 1 | -1 = 1, real = 0;
  for (const s of stops) {
    const a = tiles[tiles.length - 1];
    const ang = a.ang + a.spin * w * (s.t - a.t);
    const x = a.x + Math.cos(ang), y = a.y + Math.sin(ang);
    // 방향 바꾸기: 16칸마다 (길게 쉬는 칸 다음에만, 표시가 보이게)
    let turn = false;
    if (opts.turns && s.note >= 0) { real++; if (real % 16 === 0) { spin = spin === 1 ? -1 : 1; turn = true; } }
    tiles.push({ x, y, t: s.t, auto: s.note < 0, note: s.note, ang: ang + Math.PI, spin, turn });
  }
  return tiles;
}

/** 시각 t에서: 축이 되는 칸 번호, 도는 별의 위치·각도 */
export function orbitAt(tiles: Tile[], t: number, bpm: number): { i: number; x: number; y: number; ang: number } {
  let lo = 0, hi = tiles.length - 1;
  if (t >= tiles[hi].t) lo = hi;
  else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tiles[m].t <= t) lo = m; else hi = m; }
  const a = tiles[lo], w = ORBIT_SPEED / (60 / bpm);
  const ang = a.ang + a.spin * w * (t - a.t);
  return { i: lo, x: a.x + Math.cos(ang), y: a.y + Math.sin(ang), ang };
}
