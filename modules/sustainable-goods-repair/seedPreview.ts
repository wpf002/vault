// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    listings: [
      { title: 'Restored oak side table', kind: 'goods', priceCents: 8500, condition: 'Refinished', contact: 'meg@example.com', status: 'available' },
      { title: 'Upcycled denim tote bags', kind: 'goods', priceCents: 3200, condition: 'Handmade new', contact: '@stitchworks', status: 'available' },
      { title: 'Bike tune-up & repair', kind: 'repair', priceCents: 4500, condition: 'Service', contact: 'wheelhouse.shop', status: 'available' },
      { title: 'Vintage lamp (rewired)', kind: 'goods', priceCents: 5400, condition: 'Excellent', contact: 'meg@example.com', status: 'sold' },
      { title: 'Small-appliance repair', kind: 'repair', priceCents: 3000, condition: 'Service', contact: 'fixitcollective.org', status: 'available' },
    ],
  };
}
