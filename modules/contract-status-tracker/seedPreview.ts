// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    contracts: [
      { client: 'Acme Co', title: 'Website Redesign SOW', valueCents: 1200000, stage: 'drafting' },
      { client: 'Northwind LLC', title: 'Retainer Agreement 2026', valueCents: 6000000, stage: 'sent' },
      { client: 'Globex', title: 'Brand Refresh MSA', valueCents: 2500000, stage: 'negotiating' },
      { client: 'Initech', title: 'Q3 Consulting SOW', valueCents: 4500000, stage: 'signed' },
    ],
  };
}
