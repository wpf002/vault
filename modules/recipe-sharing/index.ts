import { defineModule } from '@vault/module-sdk';
import { RecipeSharingApp } from './RecipeSharingApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'recipe-sharing',
  name: 'Recipe Sharing App',
  Component: RecipeSharingApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#fb923c' },
});
