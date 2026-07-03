import { defineModule } from '@vault/module-sdk';
import { FitnessTrackingPlatform } from './FitnessTrackingPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'fitness-tracking-platform',
  name: 'Fitness Tracking Platform',
  Component: FitnessTrackingPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
