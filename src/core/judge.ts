// 판정·점수·콤보·체력. 화면과 상관없는 순수 계산.

export type Grade = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
export const WINDOWS = { PERFECT: 0.04, GREAT: 0.08, GOOD: 0.125, MISS: 0.16 };
const SCORE: Record<Grade, number> = { PERFECT: 300, GREAT: 200, GOOD: 100, MISS: 0 };
const LIFE: Record<Grade, number> = { PERFECT: 1.2, GREAT: 0.8, GOOD: 0, MISS: -7 };

/** diff = 누른 시각 − 노트 시각. 너무 일찍 누른 건(GOOD 밖) 아무 일도 없던 것으로 친다 */
export function grade(diff: number): Grade | null {
  if (diff < -WINDOWS.GOOD) return null;
  const d = Math.abs(diff);
  if (d <= WINDOWS.PERFECT) return 'PERFECT';
  if (d <= WINDOWS.GREAT) return 'GREAT';
  if (d <= WINDOWS.GOOD) return 'GOOD';
  if (d <= WINDOWS.MISS) return 'MISS';
  return null; // 아직 멀었음 → 누른 것으로 치지 않음
}

export interface Tally { score: number; combo: number; maxCombo: number; life: number; counts: Record<Grade, number>; total: number; failed: boolean; jam: number; jamCombo: number }
/** 잼 게이지: 잘 칠수록 차오르고, 가득 차면 잼 콤보 +1 (점수 배율이 오른다). MISS 한 번이면 처음부터. */
export const JAM_GAIN: Record<Grade, number> = { PERFECT: 4, GREAT: 2, GOOD: 0.5, MISS: 0 };

export function newTally(total: number): Tally {
  return { score: 0, combo: 0, maxCombo: 0, life: 100, counts: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 }, total, failed: false, jam: 0, jamCombo: 0 };
}

/** 판정 하나를 더한다. 돌려주는 값: 이번에 잼 콤보가 올랐는지 */
export function apply(t: Tally, g: Grade, noFail = false): boolean {
  t.counts[g] += 1;
  let jamUp = false;
  if (g === 'MISS') { t.jam = 0; t.jamCombo = 0; }
  else {
    t.jam += JAM_GAIN[g];
    if (t.jam >= 100) { t.jam -= 100; t.jamCombo += 1; jamUp = true; }
  }
  if (g === 'MISS') t.combo = 0;
  else {
    t.combo += 1;
    t.maxCombo = Math.max(t.maxCombo, t.combo);
  }
  // 잼 콤보마다 5%씩 더 (최대 2배)
  t.score += Math.round(SCORE[g] * (1 + Math.min(1, t.jamCombo * 0.05)));
  t.life = Math.max(0, Math.min(100, t.life + LIFE[g]));
  if (t.life <= 0 && !noFail) t.failed = true;
  return jamUp;
}

/** 길게 누르기를 뗀 시각 판정: 끝보다 조금 일찍 떼도 괜찮게 */
export function releaseGrade(early: number): Grade {
  if (early <= WINDOWS.GREAT) return 'PERFECT';
  if (early <= WINDOWS.GOOD) return 'GREAT';
  if (early <= 0.2) return 'GOOD';
  return 'MISS';
}

/** 정확도 0~100 */
export function accuracy(t: Tally): number {
  const n = t.counts.PERFECT + t.counts.GREAT + t.counts.GOOD + t.counts.MISS;
  if (n === 0) return 100;
  return (100 * (t.counts.PERFECT + t.counts.GREAT * 0.7 + t.counts.GOOD * 0.3)) / n;
}

export function rank(t: Tally): string {
  if (t.failed) return 'F';
  const a = accuracy(t);
  if (a >= 98 && t.counts.MISS === 0) return 'SS';
  if (a >= 93) return 'S';
  if (a >= 85) return 'A';
  if (a >= 75) return 'B';
  if (a >= 60) return 'C';
  return 'D';
}
