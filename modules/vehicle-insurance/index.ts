import { defineModule } from '@vault/module-sdk';
import { VehicleInsuranceApp } from './VehicleInsuranceApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'vehicle-insurance',
  name: 'Vehicle Insurance App',
  Component: VehicleInsuranceApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
