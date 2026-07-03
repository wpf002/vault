import { defineModule } from '@vault/module-sdk';
import { LocalBusinessLoyaltyProgramBuilder } from './LocalBusinessLoyaltyProgramBuilder';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'loyalty-program-builder',
  name: 'Local Business Loyalty Program Builder',
  Component: LocalBusinessLoyaltyProgramBuilder,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f87171' },
});
