// 자체곡 (모두 새로 쓴 곡). 소리는 audio/synth.ts 가 실시간으로 합성한다.
import { build, transpose as T, type Song } from './music.ts';

const C = (s: string) => s.split(' ');

function song(id: string, title: string, bpm: number, genre: string, lead: Song['lead'], color: string, parts: Parameters<typeof build>[0], artist = '키잼 자체곡', preview?: number): Song {
  const { events, beats, bars } = build(parts);
  return { id, title, artist, bpm, genre, lead, color, events, beats, preview, bars };
}
// 화음: 첫 음이 베이스, 나머지가 위 (피아노 반주는 이 순서로 펼친다)
const K = (s: string) => s.split(' ');

export const SONGS: Song[] = [
  song('breeze', '첫바람', 120, '팝', 'square', '#4fb0ff', [
    { bars: 4, melody: '-:4 -:4 -:4 -:2 G4:.5 A4:.5 B4:.5 D5:.5', chords: [C('G2 G3 B3 D4'), C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4')], drums: 'k...h...s...h...' },
    { bars: 8, melody: 'E5:1 D5:.5 B4:.5 D5:1 G4:1 A4:.5 B4:.5 D5:.5 E5:.5 D5:2 B4:1 A4:.5 G4:.5 A4:1 E4:1 G4:.5 A4:.5 B4:1 A4:2',
      chords: [C('G2 G3 B3 D4'), C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4')], drums: 'k.h.s.h.k.hks.h.' },
    { bars: 8, melody: 'G5:1 F#5:.5 E5:.5 D5:1 B4:1 C5:.5 D5:.5 E5:1 D5:1 B4:1 G5:1 A5:.5 G5:.5 E5:1 D5:1 E5:.5 G5:.5 A5:1 B5:2',
      chords: [C('C3 C4 E4 G4'), C('D3 D4 F#4 A4'), C('B2 B3 D4 F#4'), C('E2 E3 G3 B3')], drums: 'k.hsk.hsk.hsk.hs', arp: true },
    { bars: 4, melody: 'G5:1 E5:.5 D5:.5 B4:1 A4:1 G4:4 -:4 -:4', chords: [C('C3 C4 E4 G4'), C('D3 D4 F#4 A4'), C('G2 G3 B3 D4')], drums: 'k...h...s...h...' },
  ]),
  song('neon', '네온 질주', 150, '일렉트로', 'saw', '#ff4fa8', [
    { bars: 4, melody: '-:4 -:4 A4:.5 A4:.5 C5:.5 A4:.5 E5:.5 A4:.5 D5:.5 C5:.5 -:4', chords: [C('A2 A3 C4 E4'), C('F2 F3 A3 C4'), C('C3 C4 E4 G4'), C('G2 G3 B3 D4')], drums: 'k.h.k.h.k.h.k.hh', arp: true },
    { bars: 8, melody: 'A5:.5 G5:.5 E5:.5 A5:.5 G5:.5 E5:.5 D5:.5 E5:.5 C5:.5 D5:.5 E5:1 G5:.5 E5:.5 D5:.5 C5:.5 A4:.5 C5:.5 D5:.5 E5:.5 G5:.5 E5:.5 A5:1 G5:1 E5:2',
      chords: [C('A2 A3 C4 E4'), C('F2 F3 A3 C4'), C('C3 C4 E4 G4'), C('G2 G3 B3 D4')], drums: 'k.hsk.hsk.hsK.hs', arp: true },
    { bars: 8, melody: 'E5:.25 E5:.25 A5:.5 E5:.25 E5:.25 B5:.5 E5:.25 E5:.25 C6:.5 B5:.5 A5:.5 G5:.5 A5:.5 E5:1 D5:.5 E5:.5 G5:.5 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 A5:2',
      chords: [C('F2 F3 A3 C4'), C('G2 G3 B3 D4'), C('E2 E3 G#3 B3'), C('A2 A3 C4 E4')], drums: 'kshskshskshsKshs', arp: true },
    { bars: 4, melody: 'A5:1 G5:.5 E5:.5 D5:1 C5:1 A4:4 -:4 -:4', chords: [C('F2 F3 A3 C4'), C('G2 G3 B3 D4'), C('A2 A3 C4 E4')], drums: 'k...k...k...k...' },
  ]),
  song('moon', '달빛 계단', 96, '시티팝', 'triangle', '#ffc94f', [
    { bars: 4, melody: '-:4 -:4 -:4 -:2 F#4:.5 A4:.5 C#5:.5 E5:.5', chords: [C('D3 D4 F#4 A4'), C('B2 B3 D4 F#4'), C('G2 G3 B3 D4'), C('A2 A3 C#4 E4')], drums: 'k..h.hs.k.kh.hs.' },
    { bars: 8, melody: 'F#5:1.5 E5:.5 D5:1 C#5:1 D5:.5 E5:.5 F#5:.5 A5:.5 B5:2 A5:1.5 F#5:.5 E5:1 D5:1 B4:.5 C#5:.5 D5:.5 E5:.5 C#5:2',
      chords: [C('D3 D4 F#4 A4'), C('B2 B3 D4 F#4'), C('G2 G3 B3 D4'), C('A2 A3 C#4 E4')], drums: 'k..h.hs.k.kh.hs.' },
    { bars: 8, melody: 'A5:1 B5:.5 A5:.5 F#5:1 D5:1 E5:.5 F#5:.5 G5:1 F#5:1 E5:1 D5:1 E5:.5 F#5:.5 A5:1.5 G5:.5 F#5:1 E5:1 D5:2 -:2',
      chords: [C('G2 G3 B3 D4'), C('A2 A3 C#4 E4'), C('F#2 F#3 A3 C#4'), C('B2 B3 D4 F#4')], drums: 'k.hhs.hhk.khs.hh', arp: true },
    { bars: 4, melody: 'D5:2 C#5:1 A4:1 D5:4 -:4 -:4', chords: [C('G2 G3 B3 D4'), C('A2 A3 C#4 E4'), C('D3 D4 F#4 A4')], drums: 'k...h...s...h...' },
  ]),
  // 옛 액션 게임 보스 앞에서 몇 번이고 다시 도전하는 기분을 담은 빠른 8비트 록 (멜로디는 새로 씀)
  song('retry', '아직도 못 깼어', 172, '8비트 록', 'square', '#7ad0ff', [
    { bars: 4, melody: 'E5:.5 E5:.5 G5:.5 E5:.5 A5:.5 E5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 D5:.5 E5:2',
      chords: [C('E2 E3 G3 B3'), C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4')], drums: 'k.k.s.k.k.k.s.ss' },
    { bars: 8, melody: 'B4:.5 E5:.5 E5:.5 F#5:.5 G5:1 F#5:.5 E5:.5 D5:.5 E5:.5 F#5:1 A5:1 G5:.5 F#5:.5 E5:.5 E5:.5 D5:.5 E5:.5 G5:1 B5:1 A5:.5 G5:.5 F#5:.5 G5:.5 F#5:2',
      chords: [C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4'), C('B2 B3 D#4 F#4')], drums: 'k.h.s.h.k.k.s.h.' },
    { bars: 4, melody: 'A4:1 C5:1 E5:1 A5:1 B4:1 D#5:1 F#5:1 B5:1 C5:.5 E5:.5 G5:.5 C6:.5 G5:1 E5:1 D5:.5 F#5:.5 A5:.5 D6:.5 C6:.5 B5:.5 A5:.5 F#5:.5',
      chords: [C('A2 A3 C4 E4'), C('B2 B3 D#4 F#4'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4')], drums: 'k.h.s.h.k.h.s.hs' },
    { bars: 8, melody: 'B5:1 G5:.5 E5:.5 B5:1 C6:1 B5:.5 A5:.5 G5:1 E5:1 G5:1 D6:1 B5:.5 G5:.5 D6:.5 C6:.5 B5:1 A5:1.5 F#5:.5 D5:2 B5:1 G5:.5 E5:.5 B5:1 E6:1 D6:.5 C6:.5 B5:.5 A5:.5 G5:1 E5:1 F#5:.5 G5:.5 A5:.5 B5:.5 D#6:1 B5:1 B5:3 -:1',
      chords: [C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('G2 G3 B3 D4'), C('D3 D4 F#4 A4'), C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('B2 B3 D#4 F#4'), C('B2 B3 D#4 F#4')], drums: 'k.h.s.hkk.h.s.hs' },
    { bars: 8, melody: 'B5:1 G5:.5 E5:.5 B5:1 C6:1 B5:.5 A5:.5 G5:1 E5:1 G5:1 D6:1 B5:.5 G5:.5 D6:.5 C6:.5 B5:1 A5:1.5 F#5:.5 D5:2 B5:1 G5:.5 E5:.5 B5:1 E6:1 D6:.5 C6:.5 B5:.5 A5:.5 G5:1 E5:1 F#5:.5 G5:.5 A5:.5 B5:.5 D#6:1 F#6:1 E6:3 -:1',
      chords: [C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('G2 G3 B3 D4'), C('D3 D4 F#4 A4'), C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('B2 B3 D#4 F#4'), C('E2 E3 G3 B3')], drums: 'kshskshskshsKshs', arp: true },
    { bars: 4, melody: 'E6:.5 B5:.5 G5:.5 E5:.5 B5:.5 G5:.5 E5:.5 B4:.5 E5:4 -:4 -:4',
      chords: [C('E2 E3 G3 B3'), C('C3 C4 E4 G4'), C('D3 D4 F#4 A4'), C('E2 E3 G3 B3')], drums: 'k.k.s...k.k.s.ss' },
  ]),

  // ── 클래식 (작곡가 사후 70년이 지나 저작권이 끝난 곡). 멜로디를 리듬 게임용으로 짧게 줄여 새로 편곡 ──

  // 쇼팽, 즉흥환상곡 Op.66 (1834): 빠른 16분음표 오른손 + 가운데 느리고 노래하는 부분
  song('impromptu', '즉흥환상곡', 92, '클래식 · 피아노', 'piano', '#b48cff', [
    { bars: 1, melody: '-:3 G#4:1', chords: [K('C#2 G#2 C#3 E3')], drums: '', acc: 'broken3' },
    { bars: 8, melody:
      'G#4:.25 A4:.25 G#4:.25 G4:.25 G#4:.25 C#5:.25 E5:.25 D#5:.25 C#5:.25 D#5:.25 C#5:.25 C5:.25 C#5:.25 E5:.25 G#5:.25 A5:.25 ' +
      'G#5:.25 A5:.25 G#5:.25 G5:.25 G#5:.25 E5:.25 C#5:.25 G#4:.25 A4:.25 G#4:.25 G4:.25 G#4:.25 E4:.25 C#4:.25 E4:.25 G#4:.25 ' +
      'A4:.25 B4:.25 A4:.25 G#4:.25 A4:.25 C#5:.25 F#5:.25 E5:.25 D#5:.25 E5:.25 D#5:.25 D5:.25 D#5:.25 F#5:.25 A5:.25 B5:.25 ' +
      'G#5:.25 F#5:.25 E5:.25 D#5:.25 C5:.25 D#5:.25 F#5:.25 G#5:.25 F#5:.25 E5:.25 D#5:.25 C#5:.25 C5:.25 G#4:.25 A4:.25 C5:.25',
      chords: [K('C#2 G#2 C#3 E3'), K('C#2 G#2 C#3 E3'), K('F#1 C#2 F#2 A2'), K('G#1 D#2 G#2 C3'), K('C#2 G#2 C#3 E3'), K('A1 E2 A2 C#3'), K('G#1 D#2 G#2 C3'), K('C#2 G#2 C#3 E3')], drums: '', acc: 'broken3' },
    { bars: 8, melody: 'F5:1.5 Eb5:.5 Db5:1 C5:1 Db5:1.5 Eb5:.5 F5:1 Ab5:1 Gb5:1.5 F5:.5 Eb5:1 Db5:1 C5:3 -:1 Bb4:1.5 C5:.5 Db5:1 Eb5:1 F5:1.5 Gb5:.5 Ab5:1 F5:1 Eb5:1 Db5:1 C5:1 Eb5:1 Db5:4',
      chords: [K('Db2 Ab2 Db3 F3'), K('Bb1 F2 Bb2 Db3'), K('Gb1 Db2 Gb2 Bb2'), K('Ab1 Eb2 Gb2 C3'), K('Bb1 F2 Bb2 Db3'), K('F1 C2 F2 Ab2'), K('Ab1 Eb2 Gb2 C3'), K('Db2 Ab2 Db3 F3')], drums: '', acc: 'broken3' },
    { bars: 8, melody:
      'G#4:.25 A4:.25 G#4:.25 G4:.25 G#4:.25 C#5:.25 E5:.25 D#5:.25 C#5:.25 D#5:.25 C#5:.25 C5:.25 C#5:.25 E5:.25 G#5:.25 A5:.25 ' +
      'G#5:.25 A5:.25 G#5:.25 G5:.25 G#5:.25 E5:.25 C#5:.25 G#4:.25 A4:.25 G#4:.25 G4:.25 G#4:.25 E4:.25 C#4:.25 E4:.25 G#4:.25 ' +
      'A4:.25 B4:.25 A4:.25 G#4:.25 A4:.25 C#5:.25 F#5:.25 E5:.25 D#5:.25 E5:.25 D#5:.25 D5:.25 D#5:.25 F#5:.25 A5:.25 B5:.25 ' +
      'G#5:.25 F#5:.25 E5:.25 D#5:.25 C5:.25 D#5:.25 F#5:.25 G#5:.25 F#5:.25 E5:.25 D#5:.25 C#5:.25 C5:.25 G#4:.25 A4:.25 C5:.25',
      chords: [K('C#2 G#2 C#3 E3'), K('C#2 G#2 C#3 E3'), K('F#1 C#2 F#2 A2'), K('G#1 D#2 G#2 C3'), K('C#2 G#2 C#3 E3'), K('A1 E2 A2 C#3'), K('G#1 D#2 G#2 C3'), K('C#2 G#2 C#3 E3')], drums: '', acc: 'broken3' },
    { bars: 2, melody: 'C#5:.25 E5:.25 G#5:.25 C#6:.25 E6:.25 G#6:.25 C#7:.5 -:2 C#5:4', chords: [K('C#2 G#2 C#3 E3')], drums: '', acc: 'broken3' },
  ], '쇼팽 · 키잼 편곡', 4),

  // 포레, 시칠리안느 Op.78 (1898): 8분의 6박자의 흔들리는 리듬 (점8분-16분-8분)
  song('sicilienne', '시칠리안느', 58, '클래식 · 플루트', 'flute', '#7fd1c7', [
    { bars: 1, melody: '-:4', chords: [K('G2 D3 G3 Bb3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'D5:1/2 Eb5:1/6 D5:1/3 C5:1/2 D5:1/6 C5:1/3 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1/2 Bb4:1/6 A4:1/3 G4:1/2 A4:1/6 G4:1/3 F#4:1 G4:1/2 A4:1/6 Bb4:1/3 C5:1/2 D5:1/6 Eb5:1/3 D5:1 C5:2/3 Bb4:1/3 A4:2 G4:2',
      chords: [K('G2 D3 G3 Bb3'), K('D2 A2 C3 F#3'), K('C2 G2 C3 Eb3'), K('D2 A2 C3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'D5:1/2 Eb5:1/6 D5:1/3 C5:1/2 D5:1/6 C5:1/3 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1/2 Bb4:1/6 A4:1/3 G4:1/2 A4:1/6 G4:1/3 F#4:1 G4:1/2 A4:1/6 Bb4:1/3 C5:1/2 D5:1/6 Eb5:1/3 D5:1 C5:2/3 Bb4:1/3 A4:2 G4:2',
      chords: [K('G2 D3 G3 Bb3'), K('D2 A2 C3 F#3'), K('C2 G2 C3 Eb3'), K('D2 A2 C3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'G5:1/2 F5:1/6 Eb5:1/3 D5:1/2 Eb5:1/6 F5:1/3 G5:1 Bb5:1 A5:1/2 G5:1/6 F5:1/3 Eb5:1/2 F5:1/6 G5:1/3 F5:2 G5:1/2 Ab5:1/6 G5:1/3 F5:1/2 G5:1/6 F5:1/3 Eb5:1/2 F5:1/6 Eb5:1/3 D5:1 C5:1/2 D5:1/6 Eb5:1/3 D5:1/2 C5:1/6 Bb4:1/3 A4:2',
      chords: [K('Eb2 Bb2 Eb3 G3'), K('F2 C3 F3 A3'), K('C2 G2 C3 Eb3'), K('D2 A2 C3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'D5:1/2 Eb5:1/6 D5:1/3 C5:1/2 D5:1/6 C5:1/3 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1 Bb4:1/2 C5:1/6 Bb4:1/3 A4:1/2 Bb4:1/6 A4:1/3 G4:1/2 A4:1/6 G4:1/3 F#4:1 G4:1/2 A4:1/6 Bb4:1/3 C5:1/2 D5:1/6 Eb5:1/3 D5:1 C5:2/3 Bb4:1/3 A4:2 G4:2',
      chords: [K('G2 D3 G3 Bb3'), K('D2 A2 C3 F#3'), K('C2 G2 C3 Eb3'), K('D2 A2 C3 F#3')], drums: '', acc: 'broken3' },
    { bars: 1, melody: 'G4:4', chords: [K('G2 D3 G3 Bb3')], drums: '', acc: 'broken3' },
  ], '포레 · 키잼 편곡', 36),

  // 오펜바흐, 호프만 이야기 중 뱃노래 (1881): 곤돌라가 흔들리듯 긴-짧은 셋잇단 리듬
  song('barcarolle', '호프만의 뱃노래', 56, '클래식 · 오페라', 'triangle', '#f2a7c3', [
    { bars: 1, melody: '-:4', chords: [K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'A4:2/3 B4:1/3 A4:2/3 F#4:1/3 A4:2/3 B4:1/3 A4:1 A4:2/3 B4:1/3 A4:2/3 G4:1/3 F#4:2/3 G4:1/3 F#4:1 E4:2/3 F#4:1/3 E4:2/3 D4:1/3 E4:2/3 F#4:1/3 G4:1 F#4:2/3 G4:1/3 A4:2/3 B4:1/3 A4:2',
      chords: [K('D2 A2 D3 F#3'), K('A1 E2 G2 C#3'), K('A1 E2 G2 C#3'), K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'D5:2/3 C#5:1/3 B4:2/3 A4:1/3 B4:2/3 C#5:1/3 D5:1 E5:2/3 D5:1/3 C#5:2/3 B4:1/3 A4:2 B4:2/3 A4:1/3 G4:2/3 F#4:1/3 E4:2/3 F#4:1/3 G4:1 F#4:2 D4:2',
      chords: [K('G1 D2 G2 B2'), K('A1 E2 G2 C#3'), K('E2 B2 E3 G3'), K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'A4:2/3 B4:1/3 A4:2/3 F#4:1/3 A4:2/3 B4:1/3 A4:1 A4:2/3 B4:1/3 A4:2/3 G4:1/3 F#4:2/3 G4:1/3 F#4:1 E4:2/3 F#4:1/3 E4:2/3 D4:1/3 E4:2/3 F#4:1/3 G4:1 F#4:2/3 G4:1/3 A4:2/3 B4:1/3 A4:2',
      chords: [K('D2 A2 D3 F#3'), K('A1 E2 G2 C#3'), K('A1 E2 G2 C#3'), K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
    { bars: 4, melody: 'D5:2/3 C#5:1/3 B4:2/3 A4:1/3 B4:2/3 C#5:1/3 D5:1 E5:2/3 D5:1/3 C#5:2/3 B4:1/3 A4:2 B4:2/3 A4:1/3 G4:2/3 F#4:1/3 E4:2/3 F#4:1/3 G4:1 F#4:2 D4:2',
      chords: [K('G1 D2 G2 B2'), K('A1 E2 G2 C#3'), K('E2 B2 E3 G3'), K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
    { bars: 1, melody: 'D4:4', chords: [K('D2 A2 D3 F#3')], drums: '', acc: 'broken3' },
  ], '오펜바흐 · 키잼 편곡', 20),

  // 모차르트, 피아노 소나타 11번 3악장 '터키 행진곡' (1784): 꾸밈음 16분음표와 쿵-짝 왼손
  song('turca', '터키 행진곡', 126, '클래식 · 피아노', 'piano', '#ffb35c', [
    { bars: 4, melody: 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:1 A5:.5 C6:.5 B5:.5 A5:.5 G#5:.5 A5:.5 E5:.5 F5:.5 D5:.5 C5:.5 B4:.25 A4:.25 B4:.5 A4:2',
      chords: [K('A2 E3 A3 C4'), K('A2 E3 A3 C4'), K('E2 E3 G#3 B3'), K('A2 E3 A3 C4')], drums: '', acc: 'march' },
    { bars: 4, melody: 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:1 A5:.5 C6:.5 B5:.5 A5:.5 G#5:.5 A5:.5 E5:.5 F5:.5 D5:.5 C5:.5 B4:.25 A4:.25 B4:.5 A4:2',
      chords: [K('A2 E3 A3 C4'), K('A2 E3 A3 C4'), K('E2 E3 G#3 B3'), K('A2 E3 A3 C4')], drums: '', acc: 'march' },
    { bars: 4, melody: 'E5:.5 F5:.5 G5:.5 G5:.5 A5:.25 G5:.25 F5:.25 E5:.25 D5:1 E5:.5 F5:.5 G5:.5 G5:.5 A5:.25 G5:.25 F5:.25 E5:.25 D5:1 C5:.5 D5:.5 E5:.5 E5:.5 F5:.25 E5:.25 D5:.25 C5:.25 B4:1 B4:.25 A4:.25 G#4:.25 A4:.25 C5:.5 B4:.5 A4:2',
      chords: [K('C3 E3 G3 C4'), K('G2 D3 G3 B3'), K('E2 E3 G#3 B3'), K('A2 E3 A3 C4')], drums: '', acc: 'march' },
    { bars: 4, melody: 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:1 A5:.5 C6:.5 B5:.5 A5:.5 G#5:.5 A5:.5 E5:.5 F5:.5 D5:.5 C5:.5 B4:.25 A4:.25 B4:.5 A4:2',
      chords: [K('A2 E3 A3 C4'), K('A2 E3 A3 C4'), K('E2 E3 G#3 B3'), K('A2 E3 A3 C4')], drums: '', acc: 'march' },
    { bars: 8, melody: 'C#5:.5 D5:.5 E5:.5 E5:.5 F#5:.25 E5:.25 D5:.25 C#5:.25 B4:1 A4:.5 B4:.5 C#5:.5 C#5:.5 D5:.25 C#5:.25 B4:.25 A4:.25 G#4:1 C#5:.5 D5:.5 E5:.5 E5:.5 F#5:.25 E5:.25 D5:.25 C#5:.25 B4:.5 E5:.5 A4:.5 E5:.5 C#5:.5 E5:.5 A5:2',
      chords: [K('A2 E3 A3 C#4'), K('E2 E3 G#3 B3'), K('A2 E3 A3 C#4'), K('A2 E3 A3 C#4')], drums: '', acc: 'march' },
    { bars: 1, melody: 'A5:1 -:1 A4:2', chords: [K('A2 E3 A3 C#4')], drums: '', acc: 'march' },
  ], '모차르트 · 키잼 편곡', 64),

  // 그리그, 페르 귄트 중 '산왕의 궁전에서' (1875): 낮고 조용히 시작해 점점 빨라지는 곡 → 록 편곡
  song('mountain', '산왕의 궁전에서', 136, '클래식 · 록 편곡', 'square', '#8fbf5a', [
    { bars: 4, melody: 'B3:.5 C#4:.5 D4:.5 E4:.5 F#4:.5 D4:.5 F#4:1 F4:.5 C#4:.5 F4:1 E4:.5 C4:.5 E4:1 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:.5 D4:.5 F#4:.5 B4:.5 A4:.5 F#4:.5 D4:.5 F#4:.5 A4:2',
      chords: [K('B1 B2 D3 F#3'), K('C#2 G#2 C#3 F3'), K('B1 B2 D3 F#3'), K('D2 A2 D3 F#3')], drums: 'k.......k.......' },
    { bars: 4, melody: 'B4:.5 C#5:.5 D5:.5 E5:.5 F#5:.5 D5:.5 F#5:1 F5:.5 C#5:.5 F5:1 E5:.5 C5:.5 E5:1 B4:.5 C#5:.5 D5:.5 E5:.5 F#5:.5 D5:.5 F#5:.5 B5:.5 A5:.5 F#5:.5 D5:.5 F#5:.5 A5:2',
      chords: [K('B1 B2 D3 F#3'), K('C#2 G#2 C#3 F3'), K('B1 B2 D3 F#3'), K('D2 A2 D3 F#3')], drums: 'k...h...s...h...' },
    { bars: 4, melody: 'F#5:.5 G#5:.5 A#5:.5 B5:.5 C#6:.5 A#5:.5 C#6:1 D6:.5 A#5:.5 D6:1 C#6:.5 A#5:.5 C#6:1 F#5:.5 G#5:.5 A#5:.5 B5:.5 C#6:.5 A#5:.5 C#6:.5 F#6:.5 E6:.5 C#6:.5 A#5:.5 C#6:.5 E6:2',
      chords: [K('F#1 F#2 A#2 C#3'), K('F#1 F#2 A#2 C#3'), K('F#1 F#2 A#2 C#3'), K('F#1 F#2 A#2 E3')], drums: 'k.h.s.h.k.h.s.hs' },
    { bars: 8, melody: 'B4:.25 C#5:.25 D5:.25 E5:.25 F#5:.25 D5:.25 F#5:.5 F5:.25 C#5:.25 F5:.5 E5:.25 C5:.25 E5:.5 B4:.25 C#5:.25 D5:.25 E5:.25 F#5:.25 D5:.25 F#5:.25 B5:.25 A5:.25 F#5:.25 D5:.25 F#5:.25 A5:1',
      chords: [K('B1 B2 D3 F#3'), K('B1 B2 D3 F#3'), K('G1 G2 B2 D3'), K('F#1 F#2 A#2 C#3')], drums: 'kshskshskshsKshs', arp: true },
    { bars: 2, melody: 'F#5:.5 -:.5 F#5:.5 -:.5 B4:2 B4:4', chords: [K('F#1 F#2 A#2 C#3'), K('B1 B2 D3 F#3')], drums: 'K...K...K...K...' },
  ], '그리그 · 키잼 편곡', 48),

  // 림스키코르사코프, 왕벌의 비행 (1900): 쉬지 않고 반음씩 미끄러지는 16분음표
  song('bumblebee', '왕벌의 비행', 132, '클래식 · 바이올린', 'saw', '#ffd23f', ((): Parameters<typeof build>[0] => {
    const theme = 'A5:.25 G#5:.25 G5:.25 F#5:.25 F5:.25 A#5:.25 A5:.25 G#5:.25 A5:.25 G#5:.25 G5:.25 F#5:.25 F5:.25 A#5:.25 A5:.25 G#5:.25 ' +
      'A5:.25 G#5:.25 G5:.25 F#5:.25 G5:.25 F#5:.25 F5:.25 E5:.25 F5:.25 E5:.25 D#5:.25 D5:.25 C#5:.25 D5:.25 D#5:.25 E5:.25 ' +
      'A5:.25 A#5:.25 A5:.25 G#5:.25 A5:.25 A#5:.25 A5:.25 G#5:.25 A5:.25 A#5:.25 A5:.25 G#5:.25 A5:.25 G#5:.25 G5:.25 F#5:.25 ' +
      'F5:.25 F#5:.25 G5:.25 G#5:.25 A5:.25 G#5:.25 G5:.25 F#5:.25 F5:.25 E5:.25 D#5:.25 D5:.25 C#5:.25 C5:.25 B4:.25 A4:.25';
    const am = [K('A1 A2 C3 E3'), K('E1 E2 G#2 B2'), K('A1 A2 C3 E3'), K('E1 E2 G#2 D3')];
    return [
      { bars: 4, melody: 'E6:.25 D#6:.25 D6:.25 C#6:.25 D6:.25 C#6:.25 C6:.25 B5:.25 C6:.25 B5:.25 A#5:.25 A5:.25 G#5:.25 G5:.25 F#5:.25 F5:.25 ' +
        'E5:.25 D#5:.25 D5:.25 C#5:.25 D5:.25 C#5:.25 C5:.25 B4:.25 C5:.25 B4:.25 A#4:.25 A4:.25 G#4:.25 G4:.25 F#4:.25 F4:.25 ' +
        'E5:.25 F5:.25 E5:.25 D#5:.25 E5:.25 F5:.25 E5:.25 D#5:.25 E5:.25 F5:.25 E5:.25 D#5:.25 E5:.25 D#5:.25 D5:.25 C#5:.25 ' +
        'C5:.25 C#5:.25 D5:.25 D#5:.25 E5:.25 D#5:.25 D5:.25 C#5:.25 C5:.25 C#5:.25 D5:.25 D#5:.25 E5:.25 F5:.25 F#5:.25 G5:.25',
        chords: [K('E1 E2 G#2 B2')], drums: 'k.......k.......' },
      { bars: 4, melody: theme, chords: am, drums: 'k...h...s...h...' },
      { bars: 4, melody: T(theme, -7), chords: [K('D2 D3 F3 A3'), K('A1 A2 C#3 E3'), K('D2 D3 F3 A3'), K('A1 A2 C#3 G3')], drums: 'k.h.s.h.k.h.s.h.' },
      { bars: 4, melody: theme, chords: am, drums: 'kshskshskshsKshs', arp: true },
      { bars: 2, melody: 'E5:.25 F5:.25 F#5:.25 G5:.25 G#5:.25 A5:.25 A#5:.25 B5:.25 C6:.25 C#6:.25 D6:.25 D#6:.25 E6:1 A5:1 -:1 A4:2', chords: [K('E1 E2 G#2 B2'), K('A1 A2 C3 E3')], drums: 'K...K...K...K...' },
    ];
  })(), '림스키코르사코프 · 키잼 편곡', 16),

  // 헨리 클레이 워크, 할아버지의 낡은 시계 (1876): 똑딱똑딱 시계 소리를 하이햇으로
  song('clock', '할아버지의 낡은 시계', 100, '클래식 · 옛 노래', 'piano', '#c9a27a', ((): Parameters<typeof build>[0] => {
    const verse = 'C5:1 B4:.5 C5:.5 D5:1 C5:.5 D5:.5 E5:1 F5:.5 E5:.5 A5:1 D5:.5 D5:.5 C5:1 C5:.5 B4:.5 A4:.5 B4:.5 C5:1 -:3 G4:1';
    const C4 = K('C2 E3 G3 C4'), F = K('F2 F3 A3 C4'), G = K('G2 F3 G3 B3');
    return [
      { bars: 1, melody: '-:3 G4:1', chords: [C4], drums: 'h...h...h...h...', acc: 'march' },
      { bars: 8, melody: verse, chords: [C4, F, G, C4], drums: 'h...h...h...h...', acc: 'march' },
      { bars: 4, melody: 'E5:1 G5:.5 E5:.5 C5:1 E5:.5 G5:.5 A5:1 G5:.5 F5:.5 E5:2 D5:1 F5:.5 D5:.5 B4:1 D5:.5 F5:.5 E5:1 D5:.5 C5:.5 G4:2', chords: [C4, F, G, C4], drums: 'h...h...h...h...', acc: 'march' },
      { bars: 8, melody: 'C5:.5 C5:.5 G4:.5 G4:.5 E4:.5 E4:.5 C4:1 E5:.5 C5:.5 E5:.5 C5:.5 E5:.5 C5:.5 E5:.5 C5:.5 D5:.5 D5:.5 B4:.5 B4:.5 G4:.5 G4:.5 D4:1 F5:.5 D5:.5 F5:.5 D5:.5 F5:.5 D5:.5 F5:.5 D5:.5 ' +
        'C5:1 G4:.5 G4:.5 E4:.5 E4:.5 C4:1 C5:1 D5:.5 E5:.5 F5:1 A5:1 G5:1 E5:.5 C5:.5 D5:1 B4:1 C5:3 -:1',
        chords: [C4, C4, G, G, C4, F, G, C4], drums: 'h.h.h.h.h.h.h.h.', acc: 'march' },
      { bars: 8, melody: verse, chords: [C4, F, G, C4], drums: 'h...h...h...h...', acc: 'march' },
      { bars: 2, melody: 'G4:1 -:1 E4:1 -:1 C4:4', chords: [G, C4], drums: 'h...h...h...h...', acc: 'march' },
    ];
  })(), '헨리 클레이 워크 · 키잼 편곡', 52),

  // 베토벤, 교향곡 5번 '운명' 1악장 (1808): 빠-바-바-밤! 네 음으로 문을 두드리는 곡 → 록 편곡
  song('fate', '운명 교향곡', 168, '클래식 · 록 편곡', 'saw', '#e5484d', ((): Parameters<typeof build>[0] => {
    const Cm = K('C2 G2 C3 Eb3'), Ab = K('Ab1 Eb2 Ab2 C3'), G = K('G1 D2 G2 B2'), Fm = K('F1 C2 F2 Ab2'), Eb = K('Eb2 Bb2 Eb3 G3'), Bb = K('Bb1 F2 Bb2 D3');
    const knock = '..K.K.K.K.......';
    return [
      { bars: 4, melody: '-:.5 G5:.5 G5:.5 G5:.5 Eb5:2 Eb5:4 -:.5 F5:.5 F5:.5 F5:.5 D5:2 D5:4', chords: [Cm, Cm, G, G], drums: knock },
      { bars: 8, melody: '-:.5 G5:.5 G5:.5 G5:.5 Eb5:.5 Ab5:.5 Ab5:.5 Ab5:.5 G5:.5 Eb6:.5 Eb6:.5 Eb6:.5 C6:2 -:.5 G5:.5 G5:.5 G5:.5 D5:.5 Ab5:.5 Ab5:.5 Ab5:.5 G5:.5 F6:.5 F6:.5 F6:.5 D6:2 ' +
        '-:.5 G5:.5 G5:.5 G5:.5 Eb5:.5 C6:.5 C6:.5 C6:.5 Bb5:.5 G5:.5 G5:.5 G5:.5 Eb5:.5 F5:.5 F5:.5 F5:.5 G5:1 Eb5:1 C5:1 G5:1 F5:2 D5:2',
        chords: [Cm, Ab, Fm, G, Cm, Eb, Fm, G], drums: 'k.hsk.hsk.hsK.hs' },
      { bars: 8, melody: 'Bb5:.5 Bb5:.5 Bb5:.5 -:.5 Eb5:1 F5:1 Bb4:2 -:2 G5:1 Bb5:1 Ab5:1 G5:1 F5:1 Bb5:1 Ab5:1 G5:1 Eb5:1 G5:1 F5:1 Eb5:1 D5:2 Bb4:2 Eb5:1 F5:1 G5:1 Ab5:1 Bb5:2 G5:2',
        chords: [Eb, Bb, Eb, Bb, Eb, Bb, Ab, Bb], drums: 'k.h.s.h.k.h.s.h.', arp: true },
      { bars: 4, melody: '-:.5 G5:.5 G5:.5 G5:.5 Eb5:2 Eb5:4 -:.5 F5:.5 F5:.5 F5:.5 D5:2 D5:4', chords: [Cm, Cm, G, G], drums: knock },
      { bars: 4, melody: '-:.5 C6:.5 C6:.5 C6:.5 G5:.5 C6:.5 C6:.5 C6:.5 G5:.5 C6:.5 C6:.5 C6:.5 Ab5:2 G5:1 F5:1 Eb5:1 D5:1 C5:1 -:1 C5:1 -:1 C5:4',
        chords: [Cm, Ab, G, Cm], drums: 'kshskshskshsKshs' },
    ];
  })(), '베토벤 · 키잼 편곡', 16),

  // 라벨, 볼레로 (1928): 3박자, 작은북의 같은 리듬 위로 한 멜로디가 점점 커지다가 마지막에 조가 바뀐다
  song('bolero', '볼레로', 84, '클래식 · 3박자', 'flute', '#d9783a', ((): Parameters<typeof build>[0] => {
    const theme = 'C5:1.5 B4:.25 C5:.25 D5:.25 C5:.25 B4:.25 A4:.25 C5:.5 C5:.25 A4:.25 C5:2 B4:.5 C5:.25 A4:.25 G4:.5 E4:.25 F4:.25 G4:1 G4:2 A4:1/3 G4:1/3 F4:1/3 ' +
      'E4:.5 F4:.25 G4:.25 A4:.5 G4:.5 G4:1 G4:.5 A4:.25 B4:.25 A4:.5 G4:.5 F4:.5 E4:.5 D4:.5 E4:.25 F4:.25 E4:.5 D4:.5 E4:.5 C4:.5 C4:1 D4:1 C4:1';
    const C = K('C2 G2 C3 E3'), F = K('F2 C3 F3 A3'), G7 = K('G2 D3 F3 B3');
    const snare = 'h..hhhh..hhhh..h..';
    const hc = [C, C, F, C, C, C, G7, C];
    return [
      { bars: 2, melody: '-:3', chords: [C], drums: snare, acc: 'march', meter: 3 },
      { bars: 8, melody: theme, chords: hc, drums: snare, acc: 'march', meter: 3 },
      { bars: 8, melody: T(theme, 12), chords: hc, drums: 'k..hhhh..hhhh..h..', acc: 'march', meter: 3 },
      { bars: 8, melody: T(theme, 12), chords: hc, drums: 'k..hhhs..hhhs..hss', arp: true, meter: 3 },
      { bars: 8, melody: T(theme, 16), chords: [K('E2 B2 E3 G#3'), K('E2 B2 E3 G#3'), K('A2 E3 A3 C#4'), K('E2 B2 E3 G#3'), K('E2 B2 E3 G#3'), K('E2 B2 E3 G#3'), K('B2 F#3 A3 D#4'), K('E2 B2 E3 G#3')], drums: 'K..hhhs..hhhK..sss', arp: true, meter: 3 },
      { bars: 2, melody: 'G5:1 F5:1 E5:1 C5:3', chords: [G7, C], drums: 'K.....K.....KKKKKK', meter: 3 },
    ];
  })(), '라벨 · 키잼 편곡', 30),
];

export function songById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
