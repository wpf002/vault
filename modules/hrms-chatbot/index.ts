import { defineModule } from '@vault/module-sdk';
import { AIChatbotForHRMS } from './AIChatbotForHRMS';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'hrms-chatbot',
  name: 'AI Chatbot for HRMS',
  Component: AIChatbotForHRMS,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#22d3ee' },
});
