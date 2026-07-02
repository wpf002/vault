// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    widgets: [
      { kind: 'todo', title: 'Today', items: ['Review PR #42', 'Prep client call', 'Book dentist'] },
      { kind: 'links', title: 'Shortcuts', items: ['github.com/wpf002/vault', 'calendar.google.com', 'mail.google.com'] },
      { kind: 'notes', title: 'Scratchpad', items: ['Idea: waitlist digest email every Friday'] },
    ],
  };
}
