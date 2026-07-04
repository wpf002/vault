// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    entries: [
      {
        date: daysAgo(0),
        mood: 'good',
        text: 'Long walk before work actually changed the whole day. Meeting that I was dreading went fine — better than fine.',
        reflection: 'You noticed a direct link between the morning walk and how the dreaded meeting felt. That pattern has shown up before — movement before stress seems to work for you.',
      },
      {
        date: daysAgo(1),
        mood: 'low',
        text: 'Slept badly, snapped at Sam over nothing, then spent the evening feeling guilty about it.',
        reflection: 'Rough sleep, short fuse, then guilt — you described a chain, not a character flaw. What is one small repair step with Sam that would feel doable tomorrow?',
      },
      {
        date: daysAgo(3),
        mood: 'okay',
        text: 'Fine day. Nothing much to report, which honestly feels like a win lately.',
        reflection: 'An uneventful day registering as a win is worth noticing — it can be a sign the baseline is settling.',
      },
    ],
  };
}
