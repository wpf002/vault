import { defineModule } from '@vault/module-sdk';
import { SmartRecipePlannerPantryManager } from './SmartRecipePlannerPantryManager';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'recipe-planner-pantry',
  name: 'Smart Recipe Planner & Pantry Manager',
  Component: SmartRecipePlannerPantryManager,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#fb923c' },
});
