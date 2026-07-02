import { defineModule } from '@vault/module-sdk';
import { OnlineBookingSchedulingForServiceProviders } from './OnlineBookingSchedulingForServiceProviders';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'online-booking-scheduling',
  name: 'Online Booking & Scheduling for Service Providers',
  Component: OnlineBookingSchedulingForServiceProviders,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
