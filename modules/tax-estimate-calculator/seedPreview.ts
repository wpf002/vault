// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    quarters: [
      { quarter: 'Q1', incomeCents: 3200000, expensesCents: 480000 },
      { quarter: 'Q2', incomeCents: 3850000, expensesCents: 610000 },
    ],
    settings: [{ statePct: 5, federalPct: 22, seTaxPct: 15.3 }],
  };
}
