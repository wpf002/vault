import { defineModule } from '@vault/module-sdk';
import { InfluencerMarketingCampaignManager } from './InfluencerMarketingCampaignManager';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'influencer-campaign-manager',
  name: 'Influencer Marketing Campaign Manager',
  Component: InfluencerMarketingCampaignManager,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
