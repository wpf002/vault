import { defineModule } from '@vault/module-sdk';
import { StudyGroupOrganizer } from './StudyGroupOrganizer';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'study-group-organizer',
  name: 'Study Group Organizer',
  Component: StudyGroupOrganizer,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
