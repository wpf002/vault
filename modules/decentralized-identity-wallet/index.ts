import { defineModule } from '@vault/module-sdk';
import { DecentralizedIdentityCredentialWallet } from './DecentralizedIdentityCredentialWallet';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'decentralized-identity-wallet',
  name: 'Decentralized Identity & Credential Wallet',
  Component: DecentralizedIdentityCredentialWallet,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
