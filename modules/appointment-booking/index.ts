import { defineModule } from '@vault/module-sdk';
import { AppointmentBookingWithIntakeForms } from './AppointmentBookingWithIntakeForms';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'appointment-booking',
  name: 'Appointment Booking with Intake Forms',
  Component: AppointmentBookingWithIntakeForms,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
