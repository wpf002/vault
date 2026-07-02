// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    products: [
      { name: 'Notion Freelancer OS', kind: 'Template', priceCents: 2900, sales: 214, published: true },
      { name: 'Icon Pack — 400 Line Icons', kind: 'Design Asset', priceCents: 1900, sales: 862, published: true },
      { name: 'Budget Spreadsheet Bundle', kind: 'Spreadsheet', priceCents: 1200, sales: 391, published: true },
      { name: 'Cold Email Swipe File', kind: 'Ebook', priceCents: 3500, sales: 0, published: false },
    ],
  };
}
