// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Scores are 1-5: soreness/stress LOW is good,
// sleep/energy HIGH is good — the readiness formula accounts for direction.
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    checkins: [
      { date: daysAgo(2), soreness: 2, sleep: 4, energy: 4, stress: 2 },
      { date: daysAgo(1), soreness: 4, sleep: 3, energy: 2, stress: 3 },
      { date: daysAgo(0), soreness: 3, sleep: 4, energy: 3, stress: 2 },
    ],
  };
}
