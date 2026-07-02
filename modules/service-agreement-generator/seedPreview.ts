// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    agreements: [
      {
        client: 'Acme Co',
        service: 'Monthly bookkeeping and quarterly financial review',
        feeCents: 350000,
        termMonths: 12,
        status: 'signed',
        signedBy: 'J. Smith',
        signedAt: '2026-06-15',
        clauses: ['scope', 'payment', 'termination', 'confidentiality'],
      },
      {
        client: 'Northwind LLC',
        service: 'Website maintenance retainer',
        feeCents: 120000,
        termMonths: 6,
        status: 'sent',
        signedBy: '',
        signedAt: '',
        clauses: ['scope', 'payment', 'termination'],
      },
    ],
  };
}
