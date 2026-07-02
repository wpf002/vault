import { defineModule } from '@vault/module-sdk';
import { RecurringTaskManagerWithClientVisibility } from './RecurringTaskManagerWithClientVisibility';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'recurring-task-manager',
  name: 'Recurring Task Manager with Client Visibility',
  Component: RecurringTaskManagerWithClientVisibility,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
