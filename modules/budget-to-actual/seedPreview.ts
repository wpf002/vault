// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    lines: [
      { category: 'Payroll', budgetCents: 4200000, actualCents: 4200000 },
      { category: 'Software', budgetCents: 180000, actualCents: 214500 },
      { category: 'Marketing', budgetCents: 500000, actualCents: 322000 },
      { category: 'Office & Supplies', budgetCents: 90000, actualCents: 117800 },
      { category: 'Travel', budgetCents: 250000, actualCents: 61000 },
    ],
  };
}
