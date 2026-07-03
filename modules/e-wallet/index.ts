import { defineModule } from '@vault/module-sdk';
import { EWallet } from './EWallet';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'e-wallet',
  name: 'E-Wallet',
  Component: EWallet,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
