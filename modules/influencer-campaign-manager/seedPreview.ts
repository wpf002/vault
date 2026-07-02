// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    collabs: [
      { influencer: '@fitwithmaya', platform: 'Instagram', followers: 82000, feeCents: 120000, campaign: 'Summer Launch', stage: 'posted', reach: 54000 },
      { influencer: 'TechToni', platform: 'YouTube', followers: 210000, feeCents: 450000, campaign: 'Summer Launch', stage: 'negotiating', reach: 0 },
      { influencer: '@dailycarry', platform: 'TikTok', followers: 145000, feeCents: 200000, campaign: 'Summer Launch', stage: 'agreed', reach: 0 },
      { influencer: '@homebrewhana', platform: 'Instagram', followers: 36000, feeCents: 60000, campaign: 'Fall Teaser', stage: 'prospect', reach: 0 },
    ],
  };
}
