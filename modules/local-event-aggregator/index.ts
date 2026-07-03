import { defineModule } from '@vault/module-sdk';
import { LocalEventAggregator } from './LocalEventAggregator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'local-event-aggregator',
  name: 'Local Event Aggregator',
  Component: LocalEventAggregator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f87171' },
});
