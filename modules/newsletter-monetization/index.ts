import { defineModule } from '@vault/module-sdk';
import { NewsletterMonetizationDashboard } from './NewsletterMonetizationDashboard';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'newsletter-monetization',
  name: 'Newsletter Monetization Dashboard',
  Component: NewsletterMonetizationDashboard,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
