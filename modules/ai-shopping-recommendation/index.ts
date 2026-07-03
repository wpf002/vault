import { defineModule } from '@vault/module-sdk';
import { AIShoppingRecommendationEngine } from './AIShoppingRecommendationEngine';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'ai-shopping-recommendation',
  name: 'AI Shopping & Recommendation Engine',
  Component: AIShoppingRecommendationEngine,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
