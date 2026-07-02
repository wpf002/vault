// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    referrals: [
      { referrer: 'Dana P.', client: 'Acme Co', revenueCents: 1200000, converted: true },
      { referrer: 'Dana P.', client: 'Bluebird Studio', revenueCents: 450000, converted: true },
      { referrer: 'Lee M.', client: 'Northwind LLC', revenueCents: 0, converted: false },
      { referrer: 'Ravi K.', client: 'Globex', revenueCents: 2500000, converted: true },
      { referrer: 'Dana P.', client: 'Initech', revenueCents: 0, converted: false },
    ],
  };
}
