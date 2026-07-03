import { defineModule } from '@vault/module-sdk';
import { AIHealthWellnessCoach } from './AIHealthWellnessCoach';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'ai-health-coach',
  name: 'AI Health & Wellness Coach',
  Component: AIHealthWellnessCoach,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
