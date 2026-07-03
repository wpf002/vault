// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    tastes: [
      { item: 'Field Notes pocket notebooks', category: 'Stationery', priceCents: 1295, verdict: 'loved' },
      { item: 'Mechanical keyboard (browns)', category: 'Desk gear', priceCents: 9500, verdict: 'loved' },
      { item: 'Smart water bottle', category: 'Gadgets', priceCents: 4900, verdict: 'passed' },
      { item: 'Pour-over coffee kit', category: 'Kitchen', priceCents: 3800, verdict: 'loved' },
      { item: 'LED desk galaxy projector', category: 'Gadgets', priceCents: 3200, verdict: 'passed' },
    ],
    wishlist: [
      { product: 'Brass pen with pocket clip', why: 'Analog desk-tool taste, durable materials over gadgets.', estPrice: '$40-60' },
    ],
  };
}
