// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    guides: [
      {
        title: 'Build a cedar planter box',
        category: 'Woodworking',
        difficulty: 'beginner',
        steps: ['Cut cedar boards to length (4 sides + base)', 'Drill drainage holes in the base', 'Screw sides together with exterior screws', 'Attach base and sand all edges', 'Optional: line with landscape fabric'],
        likes: 24,
      },
      {
        title: 'Re-cane a chair seat',
        category: 'Furniture Repair',
        difficulty: 'intermediate',
        steps: ['Remove old cane and clean the groove', 'Soak new cane sheet 30 min', 'Press cane into groove with a wedge', 'Trim excess and glue spline', 'Let dry 24h before sitting'],
        likes: 11,
      },
      {
        title: 'Natural dye with onion skins',
        category: 'Textiles',
        difficulty: 'beginner',
        steps: ['Save skins from ~10 yellow onions', 'Simmer skins 1h, strain', 'Add pre-wetted fabric, simmer 30 min', 'Rinse cold until water runs clear'],
        likes: 37,
      },
    ],
  };
}
