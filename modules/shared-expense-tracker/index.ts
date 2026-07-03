import { defineModule } from '@vault/module-sdk';
import { SharedExpenseTrackerForSmallTeams } from './SharedExpenseTrackerForSmallTeams';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'shared-expense-tracker',
  name: 'Shared Expense Tracker for Small Teams',
  Component: SharedExpenseTrackerForSmallTeams,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
