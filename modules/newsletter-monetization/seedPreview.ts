// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    months: [
      { month: '2026-03', freeSubs: 2100, paidSubs: 118, revenueCents: 590000 },
      { month: '2026-04', freeSubs: 2480, paidSubs: 141, revenueCents: 705000 },
      { month: '2026-05', freeSubs: 2890, paidSubs: 176, revenueCents: 880000 },
      { month: '2026-06', freeSubs: 3150, paidSubs: 214, revenueCents: 1070000 },
    ],
  };
}
