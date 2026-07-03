import { defineModule } from '@vault/module-sdk';
import { BusinessSubscriptionAuditTool } from './BusinessSubscriptionAuditTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'subscription-audit',
  name: 'Business Subscription Audit Tool',
  Component: BusinessSubscriptionAuditTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
