// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    mentors: [
      { name: 'Priya N.', expertise: 'Engineering leadership', rateCents: 15000, bio: 'VP Eng at two startups; focuses on first-time managers.' },
      { name: 'Marcus T.', expertise: 'Product strategy', rateCents: 12000, bio: '15 years PM, ex-FAANG, loves 0→1 products.' },
      { name: 'Elena V.', expertise: 'Fundraising', rateCents: 20000, bio: 'Raised 3 rounds as founder, now angel investor.' },
    ],
    sessions: [
      { mentor: 'Priya N.', topic: 'Preparing for my first eng-manager role', date: daysFromNow(3), time: '15:00', status: 'booked' },
      { mentor: 'Marcus T.', topic: 'Roadmap review', date: daysFromNow(-4), time: '10:00', status: 'completed' },
    ],
  };
}
