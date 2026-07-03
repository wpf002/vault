// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    nights: [
      { date: daysAgo(6), hours: 7.5, quality: 4, caffeineAfternoon: false, screensLate: false },
      { date: daysAgo(5), hours: 6, quality: 2, caffeineAfternoon: true, screensLate: true },
      { date: daysAgo(4), hours: 8, quality: 5, caffeineAfternoon: false, screensLate: false },
      { date: daysAgo(3), hours: 6.5, quality: 3, caffeineAfternoon: true, screensLate: false },
      { date: daysAgo(2), hours: 5.5, quality: 2, caffeineAfternoon: true, screensLate: true },
      { date: daysAgo(1), hours: 7.8, quality: 4, caffeineAfternoon: false, screensLate: true },
    ],
  };
}
