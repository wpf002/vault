import { defineModule } from '@vault/module-sdk';
import { PersonalizedPodcastAudioContentCurator } from './PersonalizedPodcastAudioContentCurator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'podcast-audio-curator',
  name: 'Personalized Podcast & Audio Content Curator',
  Component: PersonalizedPodcastAudioContentCurator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
