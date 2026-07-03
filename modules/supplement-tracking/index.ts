import { defineModule } from '@vault/module-sdk';
import { SupplementTrackingTool } from './SupplementTrackingTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'supplement-tracking',
  name: 'Supplement Tracking Tool',
  Component: SupplementTrackingTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
