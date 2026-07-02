import { defineModule } from '@vault/module-sdk';
import { RestaurantReservationApp } from './RestaurantReservationApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'restaurant-reservation',
  name: 'Restaurant Reservation App',
  Component: RestaurantReservationApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34c1eb' },
});
