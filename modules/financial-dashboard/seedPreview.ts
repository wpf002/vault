// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    months: [
      { month: '2026-01', revenueCents: 1240000, expensesCents: 890000 },
      { month: '2026-02', revenueCents: 1115000, expensesCents: 870000 },
      { month: '2026-03', revenueCents: 1480000, expensesCents: 940000 },
      { month: '2026-04', revenueCents: 1390000, expensesCents: 915000 },
      { month: '2026-05', revenueCents: 1620000, expensesCents: 990000 },
      { month: '2026-06', revenueCents: 1755000, expensesCents: 1010000 },
    ],
    forecasts: [
      {
        summary: 'Revenue is trending up ~7% month over month with seasonal softness in February. If the pattern holds, expect roughly $18.5–19.5k in July and $19.5–21k in August. Watch expenses — they are creeping up ~2.5%/month, so margin gains depend on holding costs flat.',
        basedOn: '6 months of actuals',
      },
    ],
  };
}
