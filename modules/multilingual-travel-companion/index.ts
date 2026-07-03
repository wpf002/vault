import { defineModule } from '@vault/module-sdk';
import { MultilingualTravelCompanionPhrasebook } from './MultilingualTravelCompanionPhrasebook';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'multilingual-travel-companion',
  name: 'Multilingual Travel Companion & Phrasebook',
  Component: MultilingualTravelCompanionPhrasebook,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#38bdf8' },
});
