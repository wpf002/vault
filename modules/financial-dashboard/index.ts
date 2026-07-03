import { defineModule } from '@vault/module-sdk';
import { FinancialDashboardSmallBusinessPersonal } from './FinancialDashboardSmallBusinessPersonal';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'financial-dashboard',
  name: 'Financial Dashboard (Small Business/Personal)',
  Component: FinancialDashboardSmallBusinessPersonal,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
