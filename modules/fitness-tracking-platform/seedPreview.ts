// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    workouts: [
      { date: daysAgo(0), activity: 'Strength — full body', minutes: 45, intensity: 'hard', note: 'PR on goblet squat' },
      { date: daysAgo(1), activity: 'Walk', minutes: 30, intensity: 'easy', note: '' },
      { date: daysAgo(3), activity: 'Run — intervals', minutes: 25, intensity: 'hard', note: '6×400m' },
      { date: daysAgo(4), activity: 'Yoga', minutes: 35, intensity: 'easy', note: 'Hips finally opening up' },
      { date: daysAgo(6), activity: 'Strength — upper', minutes: 40, intensity: 'moderate', note: '' },
    ],
    tips: [
      { tip: 'Two hard days back to back this week — slot the easy walk between interval and strength days so your legs get a recovery buffer.', basedOn: '5 recent sessions' },
    ],
  };
}
