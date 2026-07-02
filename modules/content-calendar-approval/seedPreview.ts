// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    pieces: [
      { title: 'Product launch announcement', channel: 'LinkedIn', publishDate: daysFromNow(2), draft: 'Big news: our v2 is live. Here is what changed and why it matters…', status: 'pending', feedback: '' },
      { title: 'Behind-the-scenes reel', channel: 'Instagram', publishDate: daysFromNow(4), draft: 'Studio tour + how a piece goes from sketch to shipped.', status: 'approved', feedback: 'Love it — post as-is.' },
      { title: 'Customer story: Acme Co', channel: 'Blog', publishDate: daysFromNow(7), draft: 'How Acme cut onboarding time in half using…', status: 'rejected', feedback: 'Legal wants a review of the metrics claim first.' },
      { title: 'Weekly tips thread', channel: 'X', publishDate: daysFromNow(1), draft: '5 things we learned shipping this week…', status: 'pending', feedback: '' },
    ],
  };
}
