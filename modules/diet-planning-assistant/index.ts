import { defineModule } from '@vault/module-sdk';
import { DietPlanningAssistant } from './DietPlanningAssistant';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'diet-planning-assistant',
  name: 'Diet Planning Assistant',
  Component: DietPlanningAssistant,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#fb923c' },
});
