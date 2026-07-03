import { defineModule } from '@vault/module-sdk';
import { CommunityPoweredLocalDiscoveryPlatform } from './CommunityPoweredLocalDiscoveryPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'local-discovery-platform',
  name: 'Community-Powered Local Discovery Platform',
  Component: CommunityPoweredLocalDiscoveryPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f87171' },
});
