import { defineModule } from '@vault/module-sdk';
import { ContentCalendarWithClientApproval } from './ContentCalendarWithClientApproval';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'content-calendar-approval',
  name: 'Content Calendar with Client Approval',
  Component: ContentCalendarWithClientApproval,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
