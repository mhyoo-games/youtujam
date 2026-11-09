import { test } from 'node:test';
import assert from 'node:assert/strict';
import { midi, parse, build } from '../src/core/music.ts';
import { SONGS } from '../src/core/songs.ts';
import { fromSong, fromBeat, cleanRecorded, levelNumber } from '../src/core/chart.ts';
import { grade, releaseGrade, newTally, apply, accuracy, rank } from '../src/core/judge.ts';
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
