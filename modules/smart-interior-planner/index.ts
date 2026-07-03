import { defineModule } from '@vault/module-sdk';
import { SmartInteriorPlannerWithAI } from './SmartInteriorPlannerWithAI';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'smart-interior-planner',
  name: 'Smart Interior Planner with AI',
  Component: SmartInteriorPlannerWithAI,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
