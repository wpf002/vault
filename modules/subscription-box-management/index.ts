import { defineModule } from '@vault/module-sdk';
import { SubscriptionBoxManagementPlatform } from './SubscriptionBoxManagementPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'subscription-box-management',
  name: 'Subscription Box Management Platform',
  Component: SubscriptionBoxManagementPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
