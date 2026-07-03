import { defineModule } from '@vault/module-sdk';
import { FractionalRealEstateAssetOwnershipApp } from './FractionalRealEstateAssetOwnershipApp';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'fractional-asset-ownership',
  name: 'Fractional Real Estate & Asset Ownership App',
  Component: FractionalRealEstateAssetOwnershipApp,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#f5c451' },
});
