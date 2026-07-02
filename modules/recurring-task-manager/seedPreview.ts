// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    tasks: [
      { title: 'Send weekly status report', cadence: 'weekly', client: 'Acme Co', lastDone: daysAgo(8), shared: true },
      { title: 'Reconcile invoices', cadence: 'monthly', client: 'Internal', lastDone: daysAgo(12), shared: false },
      { title: 'Back up project files', cadence: 'daily', client: 'Internal', lastDone: daysAgo(0), shared: false },
      { title: 'Post social media update', cadence: 'weekly', client: 'Northwind LLC', lastDone: daysAgo(3), shared: true },
    ],
  };
}
