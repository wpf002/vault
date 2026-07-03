import { defineModule } from '@vault/module-sdk';
import { SpecializedNicheCRM } from './SpecializedNicheCRM';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'niche-crm',
  name: 'Specialized Niche CRM',
  Component: SpecializedNicheCRM,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#8fae7f' },
});
