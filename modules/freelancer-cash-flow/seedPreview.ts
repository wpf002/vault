// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function monthsFromNow(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function seedPreview() {
  return {
    settings: [{ balanceCents: 1850000, monthlyBurnCents: 620000 }],
    contracts: [
      { client: 'Acme Co', monthlyCents: 350000, endMonth: monthsFromNow(4) },
      { client: 'Northwind LLC', monthlyCents: 120000, endMonth: monthsFromNow(2) },
      { client: 'Globex (project)', monthlyCents: 180000, endMonth: monthsFromNow(1) },
    ],
  };
}
