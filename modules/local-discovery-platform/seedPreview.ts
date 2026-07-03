// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    gems: [
      { name: 'The Back-Alley Bakery', kind: 'business', neighborhood: 'Old Mill District', tip: 'Cardamom knots sell out by 9am — go early, cash only.', sharedBy: 'Nina', upvotes: 14, visited: true },
      { name: 'Sunset Overlook Behind the Water Tower', kind: 'gem', neighborhood: 'Hillcrest', tip: 'Skip the crowded park — the trail behind the tower has the same view, no crowd.', sharedBy: 'Marcus', upvotes: 22, visited: false },
      { name: 'Tuesday Vinyl Night at Cora’s', kind: 'event', neighborhood: 'Downtown', tip: 'Bring a record, get a free coffee. Regulars are welcoming to newcomers.', sharedBy: 'You', upvotes: 8, visited: true },
      { name: 'Nguyen Family Noodle Cart', kind: 'business', neighborhood: 'Riverside', tip: 'The off-menu breakfast pho exists — just ask.', sharedBy: 'Priya', upvotes: 17, visited: false },
      { name: 'Free Kayak Launch at Miller’s Bend', kind: 'gem', neighborhood: 'Riverside', tip: 'Public launch nobody knows about. Park at the gravel lot, 2-min carry.', sharedBy: 'Dev', upvotes: 11, visited: false },
    ],
  };
}
