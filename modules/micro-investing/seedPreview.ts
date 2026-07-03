// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    portfolios: [
      { name: 'Clean Energy', emoji: '⚡', risk: 'growth', investedCents: 24750, autoInvestCents: 500, cadence: 'weekly' },
      { name: 'Dividend Basics', emoji: '🏛️', risk: 'conservative', investedCents: 61200, autoInvestCents: 1000, cadence: 'weekly' },
      { name: 'Global Tech', emoji: '🛰️', risk: 'aggressive', investedCents: 18300, autoInvestCents: 0, cadence: 'off' },
    ],
    contributions: [
      { portfolio: 'Dividend Basics', amountCents: 1000, note: 'Auto-invest' },
      { portfolio: 'Clean Energy', amountCents: 500, note: 'Auto-invest' },
      { portfolio: 'Global Tech', amountCents: 2500, note: 'One-time boost' },
    ],
  };
}
