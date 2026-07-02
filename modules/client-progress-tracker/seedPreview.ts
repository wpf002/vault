// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    milestones: [
      { project: 'Acme Rebrand', title: 'Kickoff & discovery', date: daysAgo(21), done: true, attachment: 'discovery-notes.pdf' },
      { project: 'Acme Rebrand', title: 'Moodboards approved', date: daysAgo(14), done: true, attachment: '' },
      { project: 'Acme Rebrand', title: 'Logo concepts round 1', date: daysAgo(5), done: true, attachment: 'logo-concepts-r1.pdf' },
      { project: 'Acme Rebrand', title: 'Final identity delivery', date: daysAgo(-7), done: false, attachment: '' },
      { project: 'Acme Rebrand', title: 'Brand guidelines handoff', date: daysAgo(-14), done: false, attachment: '' },
    ],
  };
}
