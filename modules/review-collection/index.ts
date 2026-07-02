import { defineModule } from '@vault/module-sdk';
import { ReviewCollectionAndShowcaseTool } from './ReviewCollectionAndShowcaseTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'review-collection',
  name: 'Review Collection and Showcase Tool',
  Component: ReviewCollectionAndShowcaseTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
