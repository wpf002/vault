import { defineModule } from '@vault/module-sdk';
import { CreativeCollaborationHubForArtists } from './CreativeCollaborationHubForArtists';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'creative-collaboration-hub',
  name: 'Creative Collaboration Hub for Artists',
  Component: CreativeCollaborationHubForArtists,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
