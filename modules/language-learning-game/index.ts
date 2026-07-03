import { defineModule } from '@vault/module-sdk';
import { LanguageLearningGame } from './LanguageLearningGame';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'language-learning-game',
  name: 'Language Learning Game',
  Component: LanguageLearningGame,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
