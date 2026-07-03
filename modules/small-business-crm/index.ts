import { defineModule } from '@vault/module-sdk';
import { SmallBusinessCRMWithMarketingAutomation } from './SmallBusinessCRMWithMarketingAutomation';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'small-business-crm',
  name: 'Small Business CRM with Marketing Automation',
  Component: SmallBusinessCRMWithMarketingAutomation,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#8fae7f' },
});
