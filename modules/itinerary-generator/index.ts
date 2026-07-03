import { defineModule } from '@vault/module-sdk';
import { AIPoweredItineraryGeneratorOptimizer } from './AIPoweredItineraryGeneratorOptimizer';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'itinerary-generator',
  name: 'AI-Powered Itinerary Generator & Optimizer',
  Component: AIPoweredItineraryGeneratorOptimizer,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
