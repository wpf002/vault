// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    reviews: [
      { text: 'Setup took 5 minutes and the dashboard is gorgeous. Worth every penny.', sentiment: 'positive', theme: 'Ease of setup' },
      { text: 'Great product but support took 4 days to answer a billing question.', sentiment: 'mixed', theme: 'Support response time' },
      { text: 'The mobile app crashes every time I try to export. Unusable on the go.', sentiment: 'negative', theme: 'Mobile stability' },
      { text: 'Love the new templates! Saved my team hours this week.', sentiment: 'positive', theme: 'Templates' },
      { text: 'Cancelled — pricing doubled at renewal with no warning.', sentiment: 'negative', theme: 'Pricing transparency' },
    ],
    insights: [
      { insight: 'Product experience is a strength (setup, templates), but trust is leaking through operations: slow support and surprise renewal pricing are the two churn themes to fix first.', reviewCount: 5 },
    ],
  };
}
