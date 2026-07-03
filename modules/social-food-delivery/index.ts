import { defineModule } from '@vault/module-sdk';
import { SocialFoodDeliveryApp } from './SocialFoodDeliveryApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'social-food-delivery',
  name: 'Social Food Delivery App',
  Component: SocialFoodDeliveryApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#fb923c' },
});
