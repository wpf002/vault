import { defineModule } from '@vault/module-sdk';
import { VirtualEventBoothNetworkingPlatform } from './VirtualEventBoothNetworkingPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'virtual-event-booth',
  name: 'Virtual Event Booth & Networking Platform',
  Component: VirtualEventBoothNetworkingPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#8fae7f' },
});
