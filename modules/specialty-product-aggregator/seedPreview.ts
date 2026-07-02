// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    products: [
      { name: 'Fellow Stagg EKG', vendor: 'Fellow', priceCents: 16500, specs: { 'Capacity': '0.9 L', 'Hold Mode': 'Yes', 'Wattage': '1200 W' } },
      { name: 'Bonavita Variable', vendor: 'Bonavita', priceCents: 9900, specs: { 'Capacity': '1.0 L', 'Hold Mode': 'Yes', 'Wattage': '1000 W' } },
      { name: 'Hario Buono', vendor: 'Hario', priceCents: 6200, specs: { 'Capacity': '1.2 L', 'Hold Mode': 'No', 'Wattage': 'Stovetop' } },
    ],
  };
}
