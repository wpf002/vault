// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    updates: [
      { kind: 'update', title: 'Kickoff complete', body: 'Scope confirmed, timeline shared. First deliverable due Friday.', client: 'Acme Co', at: '2026-06-29T10:00:00.000Z' },
      { kind: 'file', title: 'brand-guidelines-v2.pdf', body: 'Final brand guidelines for review.', client: 'Acme Co', at: '2026-06-30T15:30:00.000Z' },
      { kind: 'message', title: 'Question about invoicing', body: 'Should we bill the June hours to the new PO?', client: 'Northwind LLC', at: '2026-07-01T09:15:00.000Z' },
    ],
  };
}
