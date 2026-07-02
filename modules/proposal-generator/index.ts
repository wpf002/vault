import { defineModule } from '@vault/module-sdk';
import { ProposalGenerator } from './ProposalGenerator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'proposal-generator',
  name: 'Proposal Generator',
  Component: ProposalGenerator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
