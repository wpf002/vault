import { defineModule } from '@vault/module-sdk';
import { NewsAggregator } from './NewsAggregator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'news-aggregator',
  name: 'News Aggregator',
  Component: NewsAggregator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
