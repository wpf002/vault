// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. The listening log is what the curator
// "learns" from — recommendations themselves go through the live AI proxy.
export function seedPreview() {
  return {
    log: [
      { show: 'Acquired', topic: 'Business history', verdict: 'loved' },
      { show: 'The Rest Is History', topic: 'Narrative history', verdict: 'loved' },
      { show: 'Hardcore Software (audio)', topic: 'Tech memoir', verdict: 'fine' },
      { show: 'Daily news briefing', topic: 'News', verdict: 'dropped' },
      { show: '99% Invisible', topic: 'Design', verdict: 'loved' },
    ],
    queue: [
      { title: 'The Big Dig (WGBH)', why: 'Long-form narrative about infrastructure — same DNA as your history favorites.', topic: 'Narrative history' },
    ],
  };
}
