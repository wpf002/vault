import { defineModule } from '@vault/module-sdk';
import { MentalHealthCheckInToolForTeams } from './MentalHealthCheckInToolForTeams';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'mental-health-checkin-teams',
  name: 'Mental Health Check-In Tool for Teams',
  Component: MentalHealthCheckInToolForTeams,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
