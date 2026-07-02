// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    subscribers: [
      { name: 'Dana P.', plan: 'monthly', priceCents: 3500, status: 'active', shippedThisCycle: true },
      { name: 'Lee M.', plan: 'monthly', priceCents: 3500, status: 'active', shippedThisCycle: false },
      { name: 'Ravi K.', plan: 'quarterly', priceCents: 9000, status: 'active', shippedThisCycle: false },
      { name: 'Sam T.', plan: 'monthly', priceCents: 3500, status: 'paused', shippedThisCycle: false },
    ],
    inventory: [
      { item: 'Single-origin coffee bags', onHand: 42, perBox: 1 },
      { item: 'Tasting cards', onHand: 18, perBox: 2 },
      { item: 'Branded stickers', onHand: 200, perBox: 3 },
    ],
  };
}
