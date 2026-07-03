import { defineModule } from '@vault/module-sdk';
import { GamifiedBudgetingSavingsApp } from './GamifiedBudgetingSavingsApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'gamified-budgeting',
  name: 'Gamified Budgeting & Savings App',
  Component: GamifiedBudgetingSavingsApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
