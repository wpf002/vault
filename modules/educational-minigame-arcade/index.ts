import { defineModule } from '@vault/module-sdk';
import { EducationalMiniGameArcade } from './EducationalMiniGameArcade';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'educational-minigame-arcade',
  name: 'Educational Mini-Game Arcade',
  Component: EducationalMiniGameArcade,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
