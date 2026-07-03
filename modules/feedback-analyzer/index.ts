import { defineModule } from '@vault/module-sdk';
import { AIPoweredCustomerFeedbackAnalyzer } from './AIPoweredCustomerFeedbackAnalyzer';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'feedback-analyzer',
  name: 'AI-Powered Customer Feedback Analyzer',
  Component: AIPoweredCustomerFeedbackAnalyzer,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
