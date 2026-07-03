// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    policies: [
      { vehicle: '2021 Honda CR-V', insurer: 'Lighthouse Mutual', premiumCents: 74800, deductibleCents: 50000, renewalDate: daysFromNow(23) },
      { vehicle: '2016 Ford F-150', insurer: 'Granite State Auto', premiumCents: 61200, deductibleCents: 100000, renewalDate: daysFromNow(140) },
    ],
    quotes: [
      { insurer: 'Lighthouse Mutual', premiumCents: 74800, deductibleCents: 50000 },
      { insurer: 'Beacon Direct', premiumCents: 68900, deductibleCents: 75000 },
      { insurer: 'Northstar Insurance', premiumCents: 81500, deductibleCents: 25000 },
    ],
    claims: [
      { vehicle: '2021 Honda CR-V', description: 'Windshield chip repair', amountCents: 42000, status: 'approved' },
      { vehicle: '2016 Ford F-150', description: 'Parking lot fender scrape', amountCents: 165000, status: 'filed' },
    ],
  };
}
