import { defineModule } from '@vault/module-sdk';
import { SustainableFinanceSpendingTracker } from './SustainableFinanceSpendingTracker';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'sustainable-finance-tracker',
  name: 'Sustainable Finance & Spending Tracker',
  Component: SustainableFinanceSpendingTracker,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
