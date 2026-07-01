'use client';

import { apiFetch } from '@/lib/api';

export function ManageBillingButton() {
  async function openPortal() {
    const res = await apiFetch('/billing/portal', { method: 'POST' });
    const body = await res.json().catch(() => null);
    if (body?.url) window.location.href = body.url;
  }
  return <button onClick={openPortal}>Manage Billing</button>;
}
