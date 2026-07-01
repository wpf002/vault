import Stripe from 'stripe';

// Constructed lazily so the module can be imported before STRIPE_SECRET_KEY
// is set (e.g. typecheck, or routes that don't touch Stripe in a given env).
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
    client = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return client;
}
