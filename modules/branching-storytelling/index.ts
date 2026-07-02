import { defineModule } from '@vault/module-sdk';
import { InteractiveBranchingStorytellingPlatform } from './InteractiveBranchingStorytellingPlatform';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'branching-storytelling',
  name: 'Interactive Branching Storytelling Platform',
  Component: InteractiveBranchingStorytellingPlatform,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
