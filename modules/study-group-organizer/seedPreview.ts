// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    groups: [
      { name: 'Organic Chemistry Crash Group', subject: 'Chemistry', cadence: 'Tuesdays 7pm', mentor: 'Dr. Reyes', focus: 'Reaction mechanisms before the midterm' },
      { name: 'Calc II Problem Marathon', subject: 'Math', cadence: 'Sat mornings', mentor: '', focus: 'Integration techniques, series convergence' },
    ],
    mentors: [
      { name: 'Dr. Reyes', expertise: 'Organic Chemistry (TA, 3rd year)', contact: 'office hours Thu 2–4' },
      { name: 'Priya N.', expertise: 'Calculus, took the course last spring', contact: '@priya on campus chat' },
    ],
    posts: [
      { group: 'Organic Chemistry Crash Group', author: 'You', message: 'Uploaded my mechanism cheat sheet to the shared drive — check SN1 vs SN2 table.' },
      { group: 'Organic Chemistry Crash Group', author: 'Dr. Reyes', message: 'Focus on stereochemistry this week; it is 30% of the midterm.' },
      { group: 'Calc II Problem Marathon', author: 'You', message: 'Saturday we start with trig substitution — bring problems 7.3 #10–24.' },
    ],
  };
}
