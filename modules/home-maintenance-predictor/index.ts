import { defineModule } from '@vault/module-sdk';
import { AIHomeMaintenancePredictor } from './AIHomeMaintenancePredictor';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'home-maintenance-predictor',
  name: 'AI Home Maintenance Predictor',
  Component: AIHomeMaintenancePredictor,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
