// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    transactions: [
      { kind: 'topup', label: 'Wallet Top-Up', category: '—', amountCents: 15000, cashbackCents: 0 },
      { kind: 'spend', label: 'Corner Café', category: 'Dining', amountCents: 1250, cashbackCents: 38 },
      { kind: 'spend', label: 'Metro Transit', category: 'Transport', amountCents: 550, cashbackCents: 11 },
      { kind: 'spend', label: 'Corner Grocery', category: 'Groceries', amountCents: 4320, cashbackCents: 43 },
      { kind: 'topup', label: 'Wallet Top-Up', category: '—', amountCents: 5000, cashbackCents: 0 },
    ],
  };
}
