import { defineModule } from '@vault/module-sdk';
import { RandomIdeaGenerator } from './RandomIdeaGenerator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'random-idea-generator',
  name: 'Random Idea Generator',
  Component: RandomIdeaGenerator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
