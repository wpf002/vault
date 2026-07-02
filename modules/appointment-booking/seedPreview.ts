// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    appointments: [
      { client: 'Dana P.', service: 'Initial Consultation', date: daysFromNow(1), time: '10:00', intake: 'Referred by Sam. Interested in monthly bookkeeping.', status: 'confirmed' },
      { client: 'Lee M.', service: 'Follow-Up Session', date: daysFromNow(2), time: '14:30', intake: '', status: 'pending' },
      { client: 'Ravi K.', service: 'Initial Consultation', date: daysFromNow(-3), time: '09:00', intake: 'Small e-commerce business, ~200 orders/mo.', status: 'completed' },
    ],
  };
}
