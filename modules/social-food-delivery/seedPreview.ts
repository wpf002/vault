// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    recs: [
      { restaurant: 'Bombay Street Kitchen', cuisine: 'Indian', recommendedBy: 'Priya', blurb: 'Get the pav bhaji — tastes like Mumbai. Delivery stays hot.', tried: true, rating: 5 },
      { restaurant: 'Golden Bowl Pho', cuisine: 'Vietnamese', recommendedBy: 'Marcus', blurb: 'Broth is 12-hour legit. Order extra herbs.', tried: false, rating: 0 },
      { restaurant: 'La Squadra Pizza', cuisine: 'Italian', recommendedBy: 'You', blurb: 'Square slices, crispy bottom. The vodka pie travels well.', tried: true, rating: 4 },
      { restaurant: 'Seoul Fried Chicken', cuisine: 'Korean', recommendedBy: 'Jen', blurb: 'Half soy-garlic, half gochujang. Thank me later.', tried: false, rating: 0 },
    ],
    deals: [
      { restaurant: 'Bombay Street Kitchen', deal: '20% off orders over $30', code: 'STREET20', expires: daysFromNow(5) },
      { restaurant: 'Seoul Fried Chicken', deal: 'Free delivery Mon–Wed', code: 'SFCFREE', expires: daysFromNow(12) },
      { restaurant: 'Golden Bowl Pho', deal: 'BOGO spring rolls', code: 'ROLLS2', expires: daysFromNow(-1) },
    ],
  };
}
