import { defineModule } from '@vault/module-sdk';
import { StudyGroupCoordinationTool } from './StudyGroupCoordinationTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'study-group-coordination',
  name: 'Study Group Coordination Tool',
  Component: StudyGroupCoordinationTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
