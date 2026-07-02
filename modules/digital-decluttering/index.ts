import { defineModule } from '@vault/module-sdk';
import { DigitalDeclutteringDataOrganizer } from './DigitalDeclutteringDataOrganizer';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'digital-decluttering',
  name: 'Digital Decluttering & Data Organizer',
  Component: DigitalDeclutteringDataOrganizer,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
