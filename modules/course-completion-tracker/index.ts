import { defineModule } from '@vault/module-sdk';
import { CourseCompletionTracker } from './CourseCompletionTracker';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'course-completion-tracker',
  name: 'Course Completion Tracker',
  Component: CourseCompletionTracker,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
