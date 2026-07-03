import { defineModule } from '@vault/module-sdk';
import { RecoveryTrackerForAthletes } from './RecoveryTrackerForAthletes';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'recovery-tracker',
  name: 'Recovery Tracker for Athletes',
  Component: RecoveryTrackerForAthletes,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
