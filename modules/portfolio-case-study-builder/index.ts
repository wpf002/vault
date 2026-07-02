import { defineModule } from '@vault/module-sdk';
import { PortfolioSiteWithCaseStudyBuilder } from './PortfolioSiteWithCaseStudyBuilder';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'portfolio-case-study-builder',
  name: 'Portfolio Site with Case Study Builder',
  Component: PortfolioSiteWithCaseStudyBuilder,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
