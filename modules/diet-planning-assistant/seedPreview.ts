// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    meals: [
      { date: daysAgo(0), description: 'Greek yogurt with granola and blueberries', calories: 320, proteinG: 18, note: 'Solid protein start; granola adds quick sugars — a nut handful would round it out.' },
      { date: daysAgo(0), description: 'Chicken burrito bowl, no cheese, extra beans', calories: 640, proteinG: 42, note: 'Great macro balance — the beans do real work here.' },
      { date: daysAgo(1), description: 'Two slices pepperoni pizza and a soda', calories: 780, proteinG: 24, note: 'Fine as a one-off; the soda is a third of the calories with zero staying power.' },
      { date: daysAgo(1), description: 'Salmon, roast potatoes, green beans', calories: 590, proteinG: 38, note: 'Textbook dinner — omega-3s plus fiber.' },
    ],
    recipes: [
      { title: 'High-Protein Weeknight Bowl', body: 'Sear chicken thighs (or chickpeas), pile on quinoa, roasted broccoli, quick-pickled onion, tahini-lemon drizzle. ~35g protein, 20 minutes, one pan.' },
    ],
  };
}
