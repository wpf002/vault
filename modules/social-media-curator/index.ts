import { defineModule } from '@vault/module-sdk';
import { AutomatedSocialMediaContentCurator } from './AutomatedSocialMediaContentCurator';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'social-media-curator',
  name: 'Automated Social Media Content Curator',
  Component: AutomatedSocialMediaContentCurator,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#8fae7f' },
});
