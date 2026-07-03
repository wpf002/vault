import { defineModule } from '@vault/module-sdk';
import { TaxEstimateCalculatorForContractors } from './TaxEstimateCalculatorForContractors';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'tax-estimate-calculator',
  name: 'Tax Estimate Calculator for Contractors',
  Component: TaxEstimateCalculatorForContractors,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
