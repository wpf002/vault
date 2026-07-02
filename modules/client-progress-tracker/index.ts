import { defineModule } from '@vault/module-sdk';
import { ClientProgressTracker } from './ClientProgressTracker';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'client-progress-tracker',
  name: 'Client Progress Tracker',
  Component: ClientProgressTracker,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
