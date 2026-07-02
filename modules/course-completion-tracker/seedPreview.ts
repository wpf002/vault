// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. learnersReached/learnersCompleted per lesson
// give the creator the drop-off funnel the catalog describes.
export function seedPreview() {
  return {
    lessons: [
      { course: 'Intro to Woodworking', order: 1, title: 'Tools & safety', learnersReached: 480, learnersCompleted: 452 },
      { course: 'Intro to Woodworking', order: 2, title: 'Your first cuts', learnersReached: 452, learnersCompleted: 361 },
      { course: 'Intro to Woodworking', order: 3, title: 'Joinery basics', learnersReached: 361, learnersCompleted: 244 },
      { course: 'Intro to Woodworking', order: 4, title: 'Finishing & staining', learnersReached: 244, learnersCompleted: 198 },
    ],
  };
}
