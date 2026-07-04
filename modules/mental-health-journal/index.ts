import { defineModule } from '@vault/module-sdk';
import { MentalHealthJournal } from './MentalHealthJournal';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'mental-health-journal',
  name: 'Mental Health Journal',
  Component: MentalHealthJournal,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
