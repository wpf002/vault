import { defineModule } from '@vault/module-sdk';
import { SustainableTravelImpactTracker } from './SustainableTravelImpactTracker';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'sustainable-travel-tracker',
  name: 'Sustainable Travel Impact Tracker',
  Component: SustainableTravelImpactTracker,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#38bdf8' },
});
