// SM-2 (SuperMemo 2) — the classic spaced-repetition scheduling algorithm.
// quality is 0-5: how well the card was recalled. This module surfaces it
// as four buttons (Again/Hard/Good/Easy) mapped to 1/3/4/5.
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export type SrsState = {
  interval: number; // days until next review
  repetitions: number; // consecutive successful reviews
  easeFactor: number; // how quickly the interval grows
  dueDate: string; // 'YYYY-MM-DD'
};

export function initialSrsState(): SrsState {
  return { interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: todayStr() };
}

export function schedule(state: SrsState, quality: Quality): SrsState {
  let { interval, repetitions, easeFactor } = state;

  if (quality < 3) {
    // failed recall — reset the streak, review again tomorrow
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  return { interval, repetitions, easeFactor, dueDate: addDays(interval) };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDue(dueDate: string): boolean {
  return dueDate <= todayStr();
}
