import { defineModule } from '@vault/module-sdk';
import { QuoteAndInvoiceBuilder } from './QuoteAndInvoiceBuilder';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'quote-invoice-builder',
  name: 'Quote and Invoice Builder',
  Component: QuoteAndInvoiceBuilder,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
