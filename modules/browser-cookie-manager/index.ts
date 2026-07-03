import { defineModule } from '@vault/module-sdk';
import { AIBrowserCookieManager } from './AIBrowserCookieManager';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'browser-cookie-manager',
  name: 'AI Browser Cookie Manager',
  Component: AIBrowserCookieManager,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
