import { defineModule } from '@vault/module-sdk';
import { EventVenueFinderWithRealAvailability } from './EventVenueFinderWithRealAvailability';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'event-venue-finder',
  name: 'Event Venue Finder with Real Availability',
  Component: EventVenueFinderWithRealAvailability,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff9f4a' },
});
