import { defineModule } from '@vault/module-sdk';
import { MicroInvestingPlatformForBeginners } from './MicroInvestingPlatformForBeginners';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'micro-investing',
  name: 'Micro-Investing Platform for Beginners',
  Component: MicroInvestingPlatformForBeginners,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
