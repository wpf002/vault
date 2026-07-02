// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    invoices: [
      {
        client: 'Acme Co',
        kind: 'invoice',
        taxPct: 8.5,
        lines: [
          { description: 'Homepage redesign', qty: 1, unitCents: 450000 },
          { description: 'CMS setup', qty: 1, unitCents: 180000 },
        ],
      },
      {
        client: 'Northwind LLC',
        kind: 'quote',
        taxPct: 0,
        lines: [
          { description: 'Monthly retainer (July)', qty: 1, unitCents: 350000 },
          { description: 'Extra revision rounds', qty: 2, unitCents: 25000 },
        ],
      },
    ],
  };
}
