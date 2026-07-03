// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    products: [
      { name: 'Gentle Foaming Cleanser', step: 'cleanse', routine: 'both', keyIngredients: ['glycerin', 'ceramides'], notes: '' },
      { name: 'Vitamin C Serum', step: 'treat', routine: 'am', keyIngredients: ['ascorbic acid', 'vitamin e'], notes: 'Use before sunscreen' },
      { name: 'Retinol 0.5%', step: 'treat', routine: 'pm', keyIngredients: ['retinol'], notes: 'Start 2x/week' },
      { name: 'Daily Moisturizer', step: 'moisturize', routine: 'both', keyIngredients: ['hyaluronic acid', 'ceramides'], notes: '' },
      { name: 'SPF 50 Sunscreen', step: 'protect', routine: 'am', keyIngredients: ['zinc oxide'], notes: 'Reapply midday' },
    ],
  };
}
