import { defineModule } from '@vault/module-sdk';
import { HabitTrackerWithAccountabilityPartners } from './HabitTrackerWithAccountabilityPartners';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'habit-tracker',
  name: 'Habit Tracker with Accountability Partners',
  Component: HabitTrackerWithAccountabilityPartners,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
