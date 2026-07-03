import { defineModule } from '@vault/module-sdk';
import { NeighborhoodServicesExchange } from './NeighborhoodServicesExchange';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'neighborhood-services-exchange',
  name: 'Neighborhood Services Exchange',
  Component: NeighborhoodServicesExchange,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f87171' },
});
