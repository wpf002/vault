// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    products: [
      { name: 'Linen Throw Blanket', priceCents: 6800, stock: 42, viewsWeek: 310, salesWeek: 4 },
      { name: 'Ceramic Vase Set', priceCents: 4500, stock: 3, viewsWeek: 520, salesWeek: 18 },
      { name: 'Walnut Serving Board', priceCents: 5200, stock: 27, viewsWeek: 95, salesWeek: 6 },
      { name: 'Brass Candle Snuffer', priceCents: 1800, stock: 88, viewsWeek: 40, salesWeek: 1 },
    ],
    carts: [
      { customer: 'Dana (dana@email.com)', items: 'Linen Throw Blanket + Ceramic Vase Set', valueCents: 11300, hoursAgo: 20 },
      { customer: 'Miguel (miguel@email.com)', items: 'Walnut Serving Board', valueCents: 5200, hoursAgo: 44 },
    ],
    outputs: [
      { kind: 'pricing', title: 'Pricing review — last run', body: 'Ceramic Vase Set | RAISE to $49 | High demand (520 views, 18 sales) against 3 left in stock — protect margin while restocking.\nBrass Candle Snuffer | LOWER to $14 | 40 views and 1 sale — price is not the whole story, but a 22% cut can clear slow stock.' },
    ],
  };
}
