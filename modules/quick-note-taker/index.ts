import { defineModule } from '@vault/module-sdk';
import { QuickNoteTakerWithTags } from './QuickNoteTakerWithTags';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'quick-note-taker',
  name: 'Quick Note Taker with Tags',
  Component: QuickNoteTakerWithTags,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
