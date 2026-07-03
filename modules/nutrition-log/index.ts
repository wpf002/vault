import { defineModule } from '@vault/module-sdk';
import { NutritionLogForSpecificDietaryProtocols } from './NutritionLogForSpecificDietaryProtocols';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'nutrition-log',
  name: 'Nutrition Log for Specific Dietary Protocols',
  Component: NutritionLogForSpecificDietaryProtocols,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
