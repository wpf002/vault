// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    stops: [
      { name: 'Nonna\'s Counter', dish: 'Handmade ravioli flight', neighborhood: 'Little Italy', dietTags: ['vegetarian'], priceCents: 1400, tourOrder: 1 },
      { name: 'Green Ember', dish: 'Charred cauliflower shawarma', neighborhood: 'Downtown', dietTags: ['vegan', 'gluten_free', 'halal'], priceCents: 1150, tourOrder: 2 },
      { name: 'Pho Ha Noi 2', dish: 'Brisket pho (ask for the rare plate)', neighborhood: 'Eastside', dietTags: ['gluten_free'], priceCents: 1300, tourOrder: 3 },
      { name: 'Masa y Más', dish: 'Blue-corn quesadillas', neighborhood: 'Market District', dietTags: ['vegetarian', 'gluten_free'], priceCents: 900, tourOrder: 0 },
      { name: 'The Chaat Cart', dish: 'Pani puri, extra tamarind', neighborhood: 'Market District', dietTags: ['vegan'], priceCents: 700, tourOrder: 0 },
      { name: 'Halal Bros Grill', dish: 'Lamb over rice, white sauce', neighborhood: 'Downtown', dietTags: ['halal', 'gluten_free'], priceCents: 1200, tourOrder: 0 },
    ],
  };
}
