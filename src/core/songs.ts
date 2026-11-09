// 자체곡 셋 (모두 새로 쓴 곡). 소리는 audio/synth.ts 가 실시간으로 합성한다.
import { build, type Song } from './music.ts';

const C = (s: string) => s.split(' ');

function song(id: string, title: string, bpm: number, genre: string, lead: Song['lead'], color: string, parts: Parameters<typeof build>[0]): Song {
  const { events, beats } = build(parts);
  return { id, title, artist: '유튜잼 자체곡', bpm, genre, lead, color, events, beats };
}

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
];

export function songById(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
