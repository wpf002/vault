import type { ModuleManifest } from '@vault/module-sdk';

/**
 * slug -> dynamic import of modules/<slug>, imported by its workspace
 * package name (@vault/mod-<slug>), NOT a relative path — a bare relative
 * import can't resolve `react` or `@vault/*` since modules/<slug> has no
 * node_modules of its own. Next.js code-splits each entry, so the bundle
 * never balloons no matter how many of the 120 are live. Phase 5's
 * generator adds an entry here (and to next.config.mjs's transpilePackages)
 * for every module it scaffolds. Empty until then — the shell falls back
 * to a "not available yet" state for any slug with no entry.
 */
export const MODULE_REGISTRY: Record<string, () => Promise<{ default: ModuleManifest }>> = {
  'restaurant-reservation': () => import('@vault/mod-restaurant-reservation'),
  'online-booking-scheduling': () => import('@vault/mod-online-booking-scheduling'),
  'subscription-box-management': () => import('@vault/mod-subscription-box-management'),
  'referral-tracking': () => import('@vault/mod-referral-tracking'),
  'staff-scheduling': () => import('@vault/mod-staff-scheduling'),
  'review-collection': () => import('@vault/mod-review-collection'),
  'service-agreement-generator': () => import('@vault/mod-service-agreement-generator'),
  'client-progress-tracker': () => import('@vault/mod-client-progress-tracker'),
  'quote-invoice-builder': () => import('@vault/mod-quote-invoice-builder'),
  'appointment-booking': () => import('@vault/mod-appointment-booking'),
  'task-scheduling-motivation': () => import('@vault/mod-task-scheduling-motivation'),
  'digital-decluttering': () => import('@vault/mod-digital-decluttering'),
  'form-builder': () => import('@vault/mod-form-builder'),
  'personal-dashboard': () => import('@vault/mod-personal-dashboard'),
  'recurring-task-manager': () => import('@vault/mod-recurring-task-manager'),
  'employee-onboarding-checklist': () => import('@vault/mod-employee-onboarding-checklist'),
  'proposal-generator': () => import('@vault/mod-proposal-generator'),
  'contract-status-tracker': () => import('@vault/mod-contract-status-tracker'),
  'internal-knowledge-base': () => import('@vault/mod-internal-knowledge-base'),
  'custom-client-portal': () => import('@vault/mod-custom-client-portal'),
  'flashcard-spaced-repetition': () => import('@vault/mod-flashcard-spaced-repetition'),
  'habit-tracker': () => import('@vault/mod-habit-tracker'),
  'minimalist-timer': () => import('@vault/mod-minimalist-timer'),
  'quick-note-taker': () => import('@vault/mod-quick-note-taker'),
  'unit-converter': () => import('@vault/mod-unit-converter'),
};
