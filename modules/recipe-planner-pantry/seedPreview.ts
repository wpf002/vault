// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    pantry: [
      { item: 'Chicken thighs', qty: '6 pieces', staple: false },
      { item: 'Arborio rice', qty: 'Half a bag', staple: true },
      { item: 'Cherry tomatoes', qty: '1 pint, getting soft', staple: false },
      { item: 'Spinach', qty: '1 bag', staple: false },
      { item: 'Parmesan', qty: 'A wedge', staple: true },
      { item: 'Eggs', qty: '8', staple: true },
      { item: 'Onions + garlic', qty: 'Plenty', staple: true },
    ],
    plans: [
      {
        title: '3 dinners from what\'s on hand',
        body: 'Dinner 1: Crispy chicken thighs over tomato-spinach risotto — uses the soft cherry tomatoes first.\nDinner 2: Spinach-parmesan frittata with garlicky onions, side of blistered tomatoes.\nDinner 3: Chicken + leftover risotto arancini (pan-fried, no deep fryer needed).\nShopping gap: lemon (brightens all three), chicken stock for the risotto.',
      },
    ],
  };
}
