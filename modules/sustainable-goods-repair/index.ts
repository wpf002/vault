import { defineModule } from '@vault/module-sdk';
import { SustainableGoodsRepairMarketplace } from './SustainableGoodsRepairMarketplace';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'sustainable-goods-repair',
  name: 'Sustainable Goods & Repair Marketplace',
  Component: SustainableGoodsRepairMarketplace,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff9f4a' },
});
