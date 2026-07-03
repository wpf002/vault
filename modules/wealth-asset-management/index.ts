import { defineModule } from '@vault/module-sdk';
import { WealthAssetManagementApp } from './WealthAssetManagementApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'wealth-asset-management',
  name: 'Wealth & Asset Management App',
  Component: WealthAssetManagementApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
