import { test } from 'node:test';
import assert from 'node:assert/strict';
import { midi, parse, build } from '../src/core/music.ts';
import { SONGS } from '../src/core/songs.ts';
import { fromSong, fromBeat, cleanRecorded, levelNumber } from '../src/core/chart.ts';
import { grade, releaseGrade, newTally, apply, accuracy, rank, earlyLate, typicalOffsetMs } from '../src/core/judge.ts';
import { youtubeId, tapBpm, calibrate, KEYMAPS } from '../src/core/keys.ts';

test('음 이름', () => {
  assert.equal(midi('A4'), 69);
  assert.equal(midi('C#5'), 73);
  assert.deepEqual(parse('E5:1 -:.5'), [[76, 1], [null, 0.5]]);
});

test('곡 만들기: 마디 수와 멜로디 되풀이', () => {
  const { events, beats } = build([{ bars: 2, melody: 'C5:1', chords: [['C3', 'C4', 'E4', 'G4']], drums: 'k...............' }]);
  assert.equal(beats, 8);
  assert.equal(events.filter((e) => e.part === 'lead').length, 8);
  assert.equal(events.filter((e) => e.part === 'kick').length, 2);
});

for (const s of SONGS) {
  test(`자체곡 ${s.title}: 멜로디가 구역을 넘치지 않음`, () => {
    const lead = s.events.filter((e) => e.part === 'lead');
    assert.ok(lead.length > 40);
    assert.ok(lead.every((e) => e.t + e.dur <= s.beats + 1e-6));
  });
  for (const lanes of [4, 5, 6, 7]) {
    for (const lv of ['easy', 'normal', 'hard'] as const) {
      test(`${s.title} ${lanes}건반 ${lv} 채보`, () => {
        const c = fromSong(s, lanes, lv);
        assert.ok(c.notes.length > 30, '노트가 충분함');
        assert.ok(c.notes.every((n) => n.lane >= 0 && n.lane < lanes));
        for (let i = 1; i < c.notes.length; i++) assert.ok(c.notes[i].t >= c.notes[i - 1].t, '시간순');
        // 같은 칸에 겹치는 노트 없음 (길게 누르기 포함)
        for (const a of c.notes) for (const b of c.notes) {
          if (a !== b && a.lane === b.lane && b.t > a.t) assert.ok(b.t > a.t + a.len - 1e-6, '길게 누르는 동안 같은 칸 노트 없음');
        }
      });
    }
    test(`${s.title} ${lanes}건반: 어려울수록 노트가 많음`, () => {
      const e = fromSong(s, lanes, 'easy').notes.length, n = fromSong(s, lanes, 'normal').notes.length, h = fromSong(s, lanes, 'hard').notes.length;
      assert.ok(e < n && n < h, `${e} < ${n} < ${h}`);
    });
  }
}

test('박자 채보는 같은 영상이면 늘 같음', () => {
  const a = fromBeat(120, 0.5, 60, 4, 'normal', 'abc');
  const b = fromBeat(120, 0.5, 60, 4, 'normal', 'abc');
  assert.deepEqual(a, b);
  assert.ok(a.notes.length > 40);
  assert.ok(a.notes[0].t >= 0.5 + 8 * 0.5 - 1e-6, '처음 두 마디는 쉼');
});

test('직접 친 채보 정리', () => {
  const out = cleanRecorded([{ t: 1.0, lane: 0, len: 0 }, { t: 1.02, lane: 0, len: 0 }, { t: 0.5, lane: 1, len: 0.1 }, { t: 2, lane: 9, len: 0 }], 4);
  assert.deepEqual(out, [{ t: 0.5, lane: 1, len: 0 }, { t: 1, lane: 0, len: 0 }]);
});

test('판정', () => {
  assert.equal(grade(0.01), 'PERFECT');
  assert.equal(grade(-0.07), 'GREAT');
  assert.equal(grade(0.1), 'GOOD');
  assert.equal(grade(0.15), 'MISS');
  assert.equal(grade(0.3), null);
  assert.equal(grade(-0.15), null, '너무 일찍 누르면 없던 일');
});

test('점수·콤보·체력·등급', () => {
  const t = newTally(10);
  for (let i = 0; i < 5; i++) apply(t, 'PERFECT');
  assert.equal(t.combo, 5);
  apply(t, 'MISS');
  assert.equal(t.combo, 0);
  assert.equal(t.maxCombo, 5);
  assert.ok(t.life < 100);
  assert.ok(accuracy(t) > 80 && accuracy(t) < 90);
  const f = newTally(100);
  for (let i = 0; i < 20; i++) apply(f, 'MISS');
  assert.ok(f.failed);
  assert.equal(rank(f), 'F');
  const nf = newTally(100);
  for (let i = 0; i < 20; i++) apply(nf, 'MISS', true);
  assert.ok(!nf.failed);
});

test('유튜브 주소', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('그냥 글'), null);
});

test('두드려서 BPM', () => {
  const t = [0, 0.5, 1.0, 1.5, 2.0, 2.52];
  assert.ok(Math.abs((tapBpm(t) ?? 0) - 120) < 2);
  assert.equal(tapBpm([0, 1]), null);
  assert.equal(KEYMAPS[7].length, 7);
});

test('길게 누르기: 끝 조금 전에 떼도 괜찮음', () => {
  assert.equal(releaseGrade(0.03), 'PERFECT');
  assert.equal(releaseGrade(0.1), 'GREAT');
  assert.equal(releaseGrade(0.18), 'GOOD');
  assert.equal(releaseGrade(0.5), 'MISS');
});

test('6건반 배치: 서로 다른 6개 키', () => {
  assert.equal(new Set(KEYMAPS[6]).size, 6);
  for (const n of [4, 5, 6, 7]) assert.equal(KEYMAPS[n].length, n);
});

test('판정 맞추기: 늦게 누르는 버릇은 + 쪽', () => {
  const beats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  const taps = beats.map((b, i) => b + 0.03 + (i % 2 ? 0.01 : -0.01));
  taps.push(1.25); // 엉뚱한 누름은 빠짐
  const ms = calibrate(beats, taps)!;
  assert.ok(ms >= 25 && ms <= 45, String(ms));
  assert.equal(calibrate(beats, [0.01, 0.02]), null);
});

test('잼 게이지: 가득 차면 잼 콤보, MISS면 처음부터', () => {
  const t = newTally(100);
  let ups = 0;
  for (let i = 0; i < 25; i++) if (apply(t, 'PERFECT')) ups++;
  assert.equal(ups, 1);
  assert.equal(t.jamCombo, 1);
  const before = t.score;
  apply(t, 'PERFECT');
  assert.equal(t.score - before, Math.round(300 * 1.05), '잼 콤보만큼 점수가 더');
  apply(t, 'MISS');
  assert.equal(t.jam, 0);
  assert.equal(t.jamCombo, 0);
});

test('키음: 곡에서 만든 노트는 칠 때 날 소리를 안다', () => {
  for (const s of SONGS) {
    const c = fromSong(s, 7, 'hard');
    assert.ok(c.notes.every((n) => n.ev !== undefined && Math.abs(s.events[n.ev].t * 60 / s.bpm - n.t) < 1e-9));
    assert.equal(new Set(c.notes.map((n) => n.ev)).size, c.notes.length, '한 소리는 한 노트에만');
  }
});

test('난이도 숫자: 어려울수록 크다', () => {
  for (const s of SONGS) {
    const sec = (s.beats * 60) / s.bpm;
    const e = levelNumber(fromSong(s, 4, 'easy'), sec), h = levelNumber(fromSong(s, 7, 'hard'), sec);
    assert.ok(e >= 1 && h <= 30 && e < h, `${s.title} ${e} < ${h}`);
  }
});

import { emptyLibrary, touch, addChart, chartsFor, removeChart, removeVideo, sorted, parse as parseLib, merge, migrateOld, find } from '../src/core/library.ts';

test('내 영상 목록: 영상을 바꿔도 채보가 남고, 최근 것부터', () => {
  const lib = emptyLibrary();
  const a = touch(lib, 'aaaaaaaaaaa', { title: '노래 A', duration: 200 }, 1000);
  addChart(a, 4, [{ t: 1, lane: 0, len: 0 }], 1100);
  const b = touch(lib, 'bbbbbbbbbbb', { title: '노래 B' }, 2000);
  addChart(b, 7, [{ t: 2, lane: 6, len: 0 }], 2100);
  assert.equal(chartsFor(find(lib, 'aaaaaaaaaaa'), 4).length, 1, '다른 노래를 해도 A 채보는 그대로');
  assert.deepEqual(sorted(lib).map((v) => v.id), ['bbbbbbbbbbb', 'aaaaaaaaaaa']);
  touch(lib, 'aaaaaaaaaaa', {}, 3000);
  assert.equal(sorted(lib)[0].id, 'aaaaaaaaaaa', '다시 쓰면 맨 위로');
  assert.equal(find(lib, 'aaaaaaaaaaa')!.title, '노래 A', '제목이 없으면 원래 제목 유지');
});

test('채보는 덮어쓰지 않고 쌓이고, 건반 수별로 나뉨', () => {
  const lib = emptyLibrary();
  const v = touch(lib, 'aaaaaaaaaaa', {}, 1);
  const c1 = addChart(v, 4, [], 10), c2 = addChart(v, 4, [], 10), c3 = addChart(v, 6, [], 20);
  assert.notEqual(c1.id, c2.id);
  assert.deepEqual([c1.name, c2.name, c3.name], ['채보 1', '채보 2', '채보 1']);
  assert.equal(chartsFor(v, 4).length, 2);
  assert.equal(chartsFor(v, 6).length, 1);
  assert.ok(removeChart(v, c1.id));
  assert.equal(chartsFor(v, 4).length, 1);
  assert.ok(removeVideo(lib, 'aaaaaaaaaaa'));
  assert.equal(lib.videos.length, 0);
});

test('저장 글 읽기: 망가진 값은 걸러냄', () => {
  assert.deepEqual(parseLib('엉망'), emptyLibrary());
  assert.deepEqual(parseLib(null), emptyLibrary());
  const lib = parseLib(JSON.stringify({ videos: [
    { id: 'aaaaaaaaaaa', title: 'A', charts: [{ id: 'x', lanes: 4, at: 1, name: '채보 1', notes: [{ t: 1, lane: 0, len: 0 }, { t: 2, lane: 9, len: 0 }, { t: 'x', lane: 1 }] }, { id: 'y', lanes: 3, notes: [] }] },
    { id: '나쁜 id' },
  ] }));
  assert.equal(lib.videos.length, 1);
  assert.equal(lib.videos[0].charts.length, 1, '3건반 채보는 버림');
  assert.deepEqual(lib.videos[0].charts[0].notes, [{ t: 1, lane: 0, len: 0 }]);
});

test('백업 합치기: 겹치는 채보는 한 번만', () => {
  const mine = emptyLibrary();
  const v = touch(mine, 'aaaaaaaaaaa', { title: 'A' }, 1);
  const c = addChart(v, 4, [], 5);
  const backup = parseLib(JSON.stringify(mine));
  addChart(touch(backup, 'aaaaaaaaaaa', {}, 9), 4, [], 9);
  touch(backup, 'bbbbbbbbbbb', { title: 'B' }, 9);
  const n = merge(mine, backup);
  assert.equal(n, 1);
  assert.equal(chartsFor(find(mine, 'aaaaaaaaaaa'), 4).length, 2);
  assert.ok(find(mine, 'bbbbbbbbbbb'));
  assert.ok(find(mine, 'aaaaaaaaaaa')!.charts.some((x) => x.id === c.id));
});

test('예전 저장 방식에서 옮기기', () => {
  const lib = emptyLibrary();
  const n = migrateOld(lib, [
    ['yj_chart_aaaaaaaaaaa_4', JSON.stringify({ notes: [{ t: 1, lane: 0, len: 0 }], at: 50 })],
    ['yj_beat_aaaaaaaaaaa', JSON.stringify({ bpm: 128, offset: 0.4 })],
    ['yj_chart_bbbbbbbbbbb_7', '망가짐'],
    ['yj_settings', '{}'],
  ], 100);
  assert.equal(n, 1);
  const v = find(lib, 'aaaaaaaaaaa')!;
  assert.equal(v.bpm, 128);
  assert.equal(chartsFor(v, 4).length, 1);
});

import { arrangeTaps } from '../src/core/chart.ts';

function tapsOf(times: number[], len = 0): { t: number; lane: number; len: number }[] { return times.map((t) => ({ t, lane: 0, len })); }

test('리듬 채보: 친 박자는 그대로, 칸은 자동', () => {
  const times = [1, 1.5, 2, 2.5, 3, 3.12, 3.24, 3.36, 3.48, 4, 4.5, 5];
  for (const lanes of [4, 5, 6, 7]) {
    const out = arrangeTaps(tapsOf(times), lanes, 'normal', 'x');
    const ts = [...new Set(out.map((n) => n.t))];
    assert.deepEqual(ts, times, `${lanes}건반: 박자가 그대로`);
    assert.ok(out.every((n) => n.lane >= 0 && n.lane < lanes));
    const singles = times.map((t) => out.filter((n) => n.t === t));
    for (let i = 1; i < singles.length; i++) {
      if (times[i] - times[i - 1] < 0.3) {
        const a = singles[i - 1].map((n) => n.lane), b = singles[i].map((n) => n.lane);
        assert.ok(!b.some((l) => a.includes(l)), '빠른 곳에서 같은 칸 연타 없음');
      }
    }
    assert.ok(new Set(out.map((n) => n.lane)).size >= Math.min(lanes, 4), '여러 칸을 고루 씀');
  }
  assert.deepEqual(arrangeTaps(tapsOf(times), 7, 'hard', 'a'), arrangeTaps(tapsOf(times), 7, 'hard', 'a'), '같은 채보면 늘 같음');
});

test('리듬 채보: 길게 누른 건 길게, 그동안 같은 칸에 노트 없음', () => {
  const taps = [{ t: 1, lane: 0, len: 1.2 }, { t: 1.4, lane: 0, len: 0 }, { t: 1.8, lane: 0, len: 0 }, { t: 2.1, lane: 0, len: 0 }, { t: 2.5, lane: 0, len: 0.1 }];
  for (const lanes of [4, 7]) {
    const out = arrangeTaps(taps, lanes, 'hard', 's');
    const hold = out.find((n) => n.t === 1)!;
    assert.ok(Math.abs(hold.len - 1.2) < 1e-9);
    assert.ok(out.filter((n) => n.lane === hold.lane && n.t > 1 && n.t < 2.2 + 0.04).length === 0);
    assert.equal(out.find((n) => n.t === 2.5)!.len, 0, '짧게 누른 건 보통 노트');
  }
});

test('리듬 채보: 겹친 입력 정리, 쉬움은 빠른 연타를 줄이고 어려움은 동시 누르기가 더 많음', () => {
  assert.equal(arrangeTaps(tapsOf([1, 1.01, 2]), 4, 'normal', 'q').filter((n) => n.t < 1.5).length, 1);
  const fast = Array.from({ length: 16 }, (_, i) => 1 + i * 0.1);
  assert.ok(arrangeTaps(tapsOf(fast), 4, 'easy', 'q').length < 16);
  const slow = Array.from({ length: 60 }, (_, i) => 1 + i * 0.6);
  const n = arrangeTaps(tapsOf(slow), 7, 'normal', 'q').length, hd = arrangeTaps(tapsOf(slow), 7, 'hard', 'q').length;
  assert.equal(arrangeTaps(tapsOf(slow), 7, 'easy', 'q').length, 60, '쉬움은 동시 누르기 없음');
  assert.ok(n > 60 && hd > n, `${n} < ${hd}`);
});

test('리듬 채보는 어느 건반 수에서도 보임', () => {
  const lib = emptyLibrary();
  const v = touch(lib, 'aaaaaaaaaaa', {}, 1);
  const r = addChart(v, 1, [{ t: 1, lane: 0, len: 0 }], 5);
  addChart(v, 4, [], 6);
  assert.equal(r.name, '리듬 채보 1');
  assert.equal(chartsFor(v, 7).length, 1);
  assert.equal(chartsFor(v, 4).length, 2);
  assert.equal(parseLib(JSON.stringify(lib)).videos[0].charts.length, 2, '저장했다 읽어도 남음');
});

test('FAST/SLOW와 평균 오차', () => {
  assert.equal(earlyLate(-0.03), 'FAST');
  assert.equal(earlyLate(0.03), 'SLOW');
  assert.equal(earlyLate(0.01), null);
  assert.equal(typicalOffsetMs([0.01, 0.02]), null, '너무 적으면 모름');
  const late = Array.from({ length: 20 }, (_, i) => 0.015 + (i % 3) * 0.005);
  late.push(0.5); // 엉뚱한 건 뺌
  const ms = typicalOffsetMs(late)!;
  assert.ok(ms >= 15 && ms <= 25, String(ms));
});

import { transpose, noteName } from '../src/core/music.ts';
test('옮기기(전조)와 3박자 마디', () => {
  assert.equal(transpose('C5:1 -:.5 A#4:1/3', 2), 'D5:1 -:.5 C5:1/3');
  assert.equal(noteName(61), 'C#4');
  const bolero = SONGS.find((s) => s.id === 'bolero')!;
  assert.ok(bolero.bars!.every((b, i, a) => i === 0 || b - a[i - 1] === 3), '볼레로는 마디가 3박');
  assert.equal(bolero.beats, bolero.bars!.length * 3);
});
