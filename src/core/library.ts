// 내 영상 목록: 붙여 넣은 유튜브 영상과 직접 친 채보를 이 브라우저에 모아 둔다.
// 화면·저장소와 상관없는 순수 계산 (저장은 main.ts에서 localStorage로).
import type { Note } from './chart.ts';

/** lanes 1 = 리듬 채보 (키 하나로 박자만 친 것, 칸은 할 때마다 건반 수·난이도에 맞춰 자동으로) */
export interface SavedChart { id: string; lanes: number; notes: Note[]; at: number; name: string }
export const RHYTHM = 1;
export interface Video {
  id: string; title: string; duration: number;
  bpm: number; offset: number;          // 박자 채보용
  added: number; last: number;          // 처음 넣은 때, 마지막으로 쓴 때 (ms)
  charts: SavedChart[];
}
export interface Library { version: 1; videos: Video[] }

export function emptyLibrary(): Library { return { version: 1, videos: [] }; }

/** 최근에 쓴 영상부터 */
export function sorted(lib: Library): Video[] {
  return [...lib.videos].sort((a, b) => b.last - a.last);
}

export function find(lib: Library, id: string): Video | undefined {
  return lib.videos.find((v) => v.id === id);
}

/** 영상을 불러올 때: 없으면 넣고, 있으면 제목·길이와 마지막으로 쓴 때를 고친다 */
export function touch(lib: Library, id: string, info: { title?: string; duration?: number }, now: number): Video {
  let v = find(lib, id);
  if (!v) {
    v = { id, title: info.title || id, duration: info.duration || 0, bpm: 120, offset: 0, added: now, last: now, charts: [] };
    lib.videos.push(v);
  } else {
    if (info.title) v.title = info.title;
    if (info.duration) v.duration = info.duration;
    v.last = now;
  }
  return v;
}

/** 이 영상, 이 건반 수로 할 수 있는 채보들 (리듬 채보는 어느 건반 수로도). 최근 것부터 */
export function chartsFor(v: Video | undefined, lanes: number): SavedChart[] {
  if (!v) return [];
  return v.charts.filter((c) => c.lanes === lanes || c.lanes === RHYTHM).sort((a, b) => b.at - a.at);
}

/** 새 채보를 더한다 (덮어쓰지 않음). 이름은 "채보 n" / 리듬 채보는 "리듬 채보 n" */
export function addChart(v: Video, lanes: number, notes: Note[], now: number): SavedChart {
  const n = v.charts.filter((c) => c.lanes === lanes).length + 1;
  const label = lanes === RHYTHM ? '리듬 채보' : '채보';
  let id = `c${now.toString(36)}`;
  while (v.charts.some((c) => c.id === id)) id += 'x';
  const c: SavedChart = { id, lanes, notes, at: now, name: `${label} ${n}` };
  v.charts.push(c);
  v.last = now;
  return c;
}

export function removeChart(v: Video, chartId: string): boolean {
  const before = v.charts.length;
  v.charts = v.charts.filter((c) => c.id !== chartId);
  return v.charts.length < before;
}

export function removeVideo(lib: Library, id: string): boolean {
  const before = lib.videos.length;
  lib.videos = lib.videos.filter((v) => v.id !== id);
  return lib.videos.length < before;
}

/** 저장된 글을 읽는다. 망가졌거나 모양이 다르면 빈 목록 */
export function parse(text: string | null): Library {
  if (!text) return emptyLibrary();
  try {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.videos)) return emptyLibrary();
    const videos: Video[] = [];
    for (const v of d.videos) {
      if (!v || typeof v.id !== 'string' || !/^[\w-]{11}$/.test(v.id)) continue;
      const charts: SavedChart[] = [];
      for (const c of Array.isArray(v.charts) ? v.charts : []) {
        if (!c || typeof c.id !== 'string' || ![RHYTHM, 4, 5, 6, 7].includes(c.lanes) || !Array.isArray(c.notes)) continue;
        const notes = c.notes.filter((n: Note) => n && Number.isFinite(n.t) && Number.isInteger(n.lane) && n.lane >= 0 && n.lane < c.lanes)
          .map((n: Note) => ({ t: n.t, lane: n.lane, len: Number.isFinite(n.len) && n.len > 0 ? n.len : 0 }));
        charts.push({ id: c.id, lanes: c.lanes, notes, at: Number(c.at) || 0, name: String(c.name || '채보') });
      }
      videos.push({
        id: v.id, title: String(v.title || v.id), duration: Number(v.duration) || 0,
        bpm: Number(v.bpm) || 120, offset: Number(v.offset) || 0,
        added: Number(v.added) || 0, last: Number(v.last) || 0, charts,
      });
    }
    return { version: 1, videos };
  } catch {
    return emptyLibrary();
  }
}

/** 백업 파일을 합친다: 새 영상은 더하고, 있는 영상엔 없는 채보만 더한다. 돌려주는 값: 더한 채보 수 */
export function merge(lib: Library, incoming: Library): number {
  let added = 0;
  for (const v of incoming.videos) {
    const mine = find(lib, v.id);
    if (!mine) { lib.videos.push(v); added += v.charts.length; continue; }
    for (const c of v.charts) {
      if (mine.charts.some((m) => m.id === c.id)) continue;
      mine.charts.push(c); added++;
    }
    mine.last = Math.max(mine.last, v.last);
    if (!mine.title || mine.title === mine.id) mine.title = v.title;
  }
  return added;
}

/** 예전 저장 방식(영상·건반 수마다 채보 하나)에서 옮겨 온다 */
export function migrateOld(lib: Library, entries: Array<[string, string]>, now: number): number {
  let moved = 0;
  for (const [k, val] of entries) {
    const beat = /^yj_beat_([\w-]{11})$/.exec(k);
    const chart = /^yj_chart_([\w-]{11})_(\d)$/.exec(k);
    try {
      if (beat) {
        const d = JSON.parse(val);
        const v = touch(lib, beat[1], {}, find(lib, beat[1])?.last ?? now);
        v.bpm = Number(d.bpm) || v.bpm; v.offset = Number(d.offset) || v.offset;
      } else if (chart) {
        const d = JSON.parse(val);
        const lanes = Number(chart[2]);
        if (!Array.isArray(d.notes) || !d.notes.length) continue;
        const v = touch(lib, chart[1], {}, Number(d.at) || now);
        addChart(v, lanes, d.notes, Number(d.at) || now);
        moved++;
      }
    } catch { /* 망가진 건 건너뜀 */ }
  }
  return moved;
}
