// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    purchases: [
      { merchant: 'Regional Airline', amountCents: 18900, category: 'Flights' },
      { merchant: 'Corner Grocery', amountCents: 8740, category: 'Groceries' },
      { merchant: 'Shell Station', amountCents: 5200, category: 'Gasoline' },
      { merchant: 'Thrift & Found', amountCents: 3400, category: 'Secondhand' },
      { merchant: 'Metro Card Reload', amountCents: 2000, category: 'Public Transit' },
      { merchant: 'Butcher Block', amountCents: 4600, category: 'Meat & Dairy' },
    ],
  };
}
