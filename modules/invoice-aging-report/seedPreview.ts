// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    invoices: [
      { client: 'Acme Co', number: 'INV-1041', amountCents: 450000, dueDate: daysAgo(-12), paid: false, lastReminder: '' },
      { client: 'Northwind LLC', number: 'INV-1038', amountCents: 120000, dueDate: daysAgo(8), paid: false, lastReminder: daysAgo(2) },
      { client: 'Globex', number: 'INV-1029', amountCents: 250000, dueDate: daysAgo(45), paid: false, lastReminder: daysAgo(14) },
      { client: 'Initech', number: 'INV-1035', amountCents: 90000, dueDate: daysAgo(70), paid: false, lastReminder: '' },
      { client: 'Acme Co', number: 'INV-1030', amountCents: 300000, dueDate: daysAgo(20), paid: true, lastReminder: '' },
    ],
  };
}
