// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    tasks: [
      { title: 'Ship laptop + peripherals', assignee: 'IT', dueDate: daysFromNow(-2), done: true, hire: 'Jordan Lee' },
      { title: 'Create accounts (email, Slack, GitHub)', assignee: 'IT', dueDate: daysFromNow(-1), done: true, hire: 'Jordan Lee' },
      { title: 'Intro meeting with team leads', assignee: 'Manager', dueDate: daysFromNow(1), done: false, hire: 'Jordan Lee' },
      { title: 'Assign first-week starter task', assignee: 'Manager', dueDate: daysFromNow(3), done: false, hire: 'Jordan Lee' },
      { title: 'Benefits enrollment walkthrough', assignee: 'HR', dueDate: daysFromNow(5), done: false, hire: 'Jordan Lee' },
    ],
  };
}
