import { defineModule } from '@vault/module-sdk';
import { ECommerceAIAgent } from './ECommerceAIAgent';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'ecommerce-ai-agent',
  name: 'E-Commerce AI Agent',
  Component: ECommerceAIAgent,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
