// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    expenses: [
      { payer: 'Alex', description: 'Team lunch', amountCents: 8400, receipt: 'lunch-0628.jpg' },
      { payer: 'Sam', description: 'Figma seats (June)', amountCents: 4500, receipt: '' },
      { payer: 'Alex', description: 'Conference tickets ×2', amountCents: 39800, receipt: 'conf-inv.pdf' },
      { payer: 'Jo', description: 'Office snacks', amountCents: 3200, receipt: '' },
    ],
  };
}
