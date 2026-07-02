import { defineModule } from '@vault/module-sdk';
import { DigitalProductStorefront } from './DigitalProductStorefront';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'digital-product-storefront',
  name: 'Digital Product Storefront',
  Component: DigitalProductStorefront,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
