// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    posts: [
      { title: 'Welcome & community guidelines', tier: 'free', body: 'Start here — how the community works and where to introduce yourself.', pinned: true },
      { title: 'Monthly Q&A recording — June', tier: 'member', body: 'Full recording and timestamps from the June member call.', pinned: false },
      { title: 'Deal flow spreadsheet (live)', tier: 'premium', body: 'The live tracker we update weekly. Premium members only.', pinned: false },
      { title: 'Getting your first 100 users', tier: 'free', body: 'A public deep-dive to share with friends.', pinned: false },
      { title: 'Template vault access', tier: 'member', body: 'All member templates in one place.', pinned: false },
    ],
  };
}
