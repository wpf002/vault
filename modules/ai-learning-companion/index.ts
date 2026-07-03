import { defineModule } from '@vault/module-sdk';
import { AILearningCompanion } from './AILearningCompanion';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'ai-learning-companion',
  name: 'AI Learning Companion',
  Component: AILearningCompanion,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
