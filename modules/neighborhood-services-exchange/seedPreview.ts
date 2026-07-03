// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    posts: [
      { kind: 'need', title: 'Gutter cleaning before the rain hits', neighbor: 'Rosa (Elm St)', category: 'Home', status: 'open', matchedWith: '' },
      { kind: 'offer', title: 'Ladder + happy to do gutters on weekends', neighbor: 'Dev (Oak Ct)', category: 'Home', status: 'open', matchedWith: '' },
      { kind: 'offer', title: 'Free beginner guitar lessons, Tuesdays', neighbor: 'Sam (Elm St)', category: 'Lessons', status: 'open', matchedWith: '' },
      { kind: 'need', title: 'Ride to the airport Friday 6am', neighbor: 'Priya (Birch Ln)', category: 'Transport', status: 'matched', matchedWith: 'Marcus (Oak Ct) — has a van' },
      { kind: 'offer', title: 'Tomato seedlings, more than I can plant', neighbor: 'You', category: 'Garden', status: 'open', matchedWith: '' },
    ],
    messages: [
      { post: 'Ride to the airport Friday 6am', from: 'Marcus (Oak Ct)', text: 'I can take you — meet at the corner at 5:40?' },
      { post: 'Ride to the airport Friday 6am', from: 'Priya (Birch Ln)', text: 'Perfect, thank you! Coffee is on me.' },
    ],
  };
}
