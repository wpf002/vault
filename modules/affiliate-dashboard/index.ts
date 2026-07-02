import { defineModule } from '@vault/module-sdk';
import { AffiliateDashboard } from './AffiliateDashboard';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'affiliate-dashboard',
  name: 'Affiliate Dashboard',
  Component: AffiliateDashboard,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
