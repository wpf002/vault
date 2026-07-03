// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    recipes: [
      {
        name: 'Weeknight Dan Dan Noodles',
        ingredients: ['noodles', 'ground pork', 'chili oil', 'sichuan peppercorn', 'scallions', 'peanut butter'],
        steps: 'Brown the pork with aromatics. Whisk the sauce. Boil noodles, toss everything, top with scallions.',
        minutes: 25,
        rating: 5,
      },
      {
        name: 'Sheet-Pan Lemon Chicken',
        ingredients: ['chicken thighs', 'lemon', 'potatoes', 'garlic', 'rosemary', 'olive oil'],
        steps: 'Toss everything on one pan. Roast at 425°F for 35 minutes. Rest 5 before serving.',
        minutes: 45,
        rating: 4,
      },
      {
        name: 'Miso Butter Pasta',
        ingredients: ['pasta', 'miso', 'butter', 'parmesan', 'black pepper'],
        steps: 'Cook pasta. Emulsify miso + butter with pasta water. Toss with parm and pepper.',
        minutes: 20,
        rating: 5,
      },
    ],
  };
}
