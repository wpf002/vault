import { defineModule } from '@vault/module-sdk';
import { ImmersiveLocalCultureTravelGuide } from './ImmersiveLocalCultureTravelGuide';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'local-culture-travel-guide',
  name: 'Immersive Local Culture & Travel Guide',
  Component: ImmersiveLocalCultureTravelGuide,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#38bdf8' },
});
