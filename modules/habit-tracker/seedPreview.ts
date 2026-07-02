// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Dates are relative to real "today" so the
// demo streaks look alive (e.g. "on a streak right up to today") instead
// of stale — stable within a session, which is what the no-randomness
// rule is actually protecting against.
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    habits: [
      { name: 'Drink water', checkins: [daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)] },
      { name: 'Read 10 pages', checkins: [daysAgo(6), daysAgo(5), daysAgo(2), daysAgo(1)] },
      { name: 'Stretch', checkins: [daysAgo(1)] },
    ],
  };
}
