import { defineModule } from '@vault/module-sdk';
import { DigitalDiceRollerCoinFlipper } from './DigitalDiceRollerCoinFlipper';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'dice-roller-coin-flipper',
  name: 'Digital Dice Roller / Coin Flipper',
  Component: DigitalDiceRollerCoinFlipper,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#9aa5b1' },
});
