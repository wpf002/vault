import { defineModule } from '@vault/module-sdk';
import { OnlineCoursePlatformWithInteractiveLessons } from './OnlineCoursePlatformWithInteractiveLessons';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'online-course-platform',
  name: 'Online Course Platform with Interactive Lessons',
  Component: OnlineCoursePlatformWithInteractiveLessons,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
