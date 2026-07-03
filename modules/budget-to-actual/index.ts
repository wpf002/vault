import { defineModule } from '@vault/module-sdk';
import { BudgetToActualComparisonTool } from './BudgetToActualComparisonTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'budget-to-actual',
  name: 'Budget-to-Actual Comparison Tool',
  Component: BudgetToActualComparisonTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
