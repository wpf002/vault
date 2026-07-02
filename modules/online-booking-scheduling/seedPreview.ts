// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    services: [
      { name: 'Haircut', minutes: 30, priceCents: 4500 },
      { name: 'Color & Style', minutes: 90, priceCents: 14000 },
      { name: 'Consultation', minutes: 15, priceCents: 0 },
    ],
    slots: [
      { time: '09:00', booked: '', service: '' },
      { time: '10:00', booked: 'Dana P.', service: 'Haircut' },
      { time: '11:00', booked: '', service: '' },
      { time: '13:00', booked: 'Lee M.', service: 'Color & Style' },
      { time: '15:00', booked: '', service: '' },
      { time: '16:00', booked: '', service: '' },
    ],
  };
}
