// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    profile: [{ subject: 'Statistics', level: 'Beginner', style: 'examples_first' }],
    lessons: [
      {
        topic: 'What a p-value actually tells you',
        body: 'Imagine flipping a coin 20 times and getting 16 heads. A p-value answers one question: "If the coin were fair, how surprising would this result be?" Getting 16+ heads from a fair coin happens about 0.6% of the time — that\'s the p-value (0.006). It does NOT tell you the probability the coin is fair. It tells you how weird your data would be IF it were.',
        grade: 'got_it',
      },
      {
        topic: 'Standard deviation, by feel',
        body: 'Two pizzerias both average 30-minute deliveries. Pizzeria A is always 28-32 minutes. Pizzeria B swings from 10 to 50. Same mean, wildly different experience — standard deviation is the number that captures that difference. A has a small one (~1.5 min), B has a huge one (~15 min).',
        grade: 'shaky',
      },
    ],
  };
}
