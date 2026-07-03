// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    brand: [{ business: 'Fernwood Coffee Roasters', voice: 'Warm, a little nerdy about beans, never salesy', audience: 'Local coffee lovers and home brewers' }],
    posts: [
      { day: 'Monday', hook: 'The 30-second bloom test', body: 'Pour a little water on your grounds and wait. If they puff up, your beans are fresh. If nothing happens… come see us. ☕', hashtags: '#coffeenerd #freshroast #homebrewing', status: 'posted' },
      { day: 'Wednesday', hook: 'Meet the farm behind this month\'s single origin', body: 'Our Huila lot comes from a 12-family co-op growing at 1,800m. Tasting notes: red apple, panela, a finish like cocoa nibs.', hashtags: '#singleorigin #directtrade #huila', status: 'scheduled' },
      { day: 'Friday', hook: 'Wrong grind ruins good beans', body: 'Espresso = table salt. Pour-over = coarse sand. French press = breadcrumbs. Screenshot this — your morning self will thank you.', hashtags: '#coffeetips #grindsize', status: 'draft' },
    ],
  };
}
