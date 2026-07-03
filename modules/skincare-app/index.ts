import { defineModule } from '@vault/module-sdk';
import { SkincareApp } from './SkincareApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'skincare-app',
  name: 'Skincare App',
  Component: SkincareApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
