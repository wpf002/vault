import { defineModule } from '@vault/module-sdk';
import { PetServiceLocator } from './PetServiceLocator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'pet-service-locator',
  name: 'Pet Service Locator',
  Component: PetServiceLocator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff9f4a' },
});
