import { defineModule } from '@vault/module-sdk';
import { ContractStatusTracker } from './ContractStatusTracker';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'contract-status-tracker',
  name: 'Contract Status Tracker',
  Component: ContractStatusTracker,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
