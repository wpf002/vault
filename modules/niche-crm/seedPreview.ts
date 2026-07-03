// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    settings: [{ industry: 'photography' }],
    clients: [
      { name: 'Rivera Wedding', contact: 'ana.rivera@email.com', detail: 'Oct 18, golden-hour ceremony, 2 shooters', stage: 'Booked', valueCents: 320000 },
      { name: 'Chen Family Portraits', contact: '(555) 014-2288', detail: 'Fall mini-session, 5 people + dog', stage: 'Inquiry', valueCents: 45000 },
      { name: 'Brightline Co. Headshots', contact: 'ops@brightline.co', detail: '14 employees, on-site studio day', stage: 'Proposal Sent', valueCents: 210000 },
      { name: 'Okafor Engagement', contact: 'm.okafor@email.com', detail: 'Downtown session, delivered — awaiting album pick', stage: 'Editing & Delivery', valueCents: 85000 },
    ],
  };
}
