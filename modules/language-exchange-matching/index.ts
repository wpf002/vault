import { defineModule } from '@vault/module-sdk';
import { LanguageExchangeMatchingTool } from './LanguageExchangeMatchingTool';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'language-exchange-matching',
  name: 'Language Exchange Matching Tool',
  Component: LanguageExchangeMatchingTool,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
