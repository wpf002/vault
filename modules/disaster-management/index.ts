import { defineModule } from '@vault/module-sdk';
import { DisasterManagementApp } from './DisasterManagementApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'disaster-management',
  name: 'Disaster Management App',
  Component: DisasterManagementApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f87171' },
});
