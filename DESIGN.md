# Vault Design Baseline

This is the locked-in design system for the platform, set 2026-07-01. It
covers two layers that are deliberately kept separate: the **shell** (the
store itself — nav, catalog, buy wall, account pages) and **modules** (the
120 mini-apps). Every new page or module should read like it already
follows this doc, not like it's improvising.

## The shell / module split

- **Shell chrome** (nav, catalog, buy wall, account/library pages) uses
  `--color-accent` / `--color-accent-2` — a blue→violet gradient
  (`--gradient-accent`). This is the platform's own identity. It never
  appears inside a module.
- **Modules** use `--module-accent`, set per-module by `ModuleRuntime` from
  `ModuleManifest.theme.accent`. A module's buttons, focus rings, active
  states, and stat readouts are its own color — never the shell's.
  `@vault/module-ui`'s components (`Button`, `GatedAction`, `Input`,
  `Select`, `StatDisplay`, …) already read `--module-accent`; reach for
  those instead of raw `<button>`/`<input>` inside a module.

If you're not sure which variable to use: is this pixel part of the store,
or part of an app inside the store? Store → `--color-accent`. App →
`--module-accent`.

## Color tokens (`apps/web/src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#000000` | page background |
| `--color-surface` / `--color-surface-raised` | `#1c1c1e` / `#242426` | cards, panels |
| `--color-border` | `#2e2e30` | hairlines |
| `--color-text` / `--color-text-dim` | `#f5f5f7` / `#98989d` | primary / secondary text |
| `--color-accent`, `--color-accent-2`, `--gradient-accent` | blue → violet | shell-only CTAs |
| `--color-live` / `--color-soon` | green / orange | status badges |
| `--module-accent` | set per module | everything inside a module |

Category → default module accent lives in `@vault/module-sdk`'s
`CATEGORY_ACCENTS` (finance gold, health green, utilities slate, etc.) —
`gen:module` bakes it into a new module's manifest automatically. Override
it when something more specific to what the app actually does fits better
(e.g. `unit-converter` overrides utilities' slate with Calculator-orange).

## Text casing

- **Title Case**: headings, nav links, button labels, badges, filter
  pills, section titles. Use `statusLabel()` / `categoryLabel()`
  (`apps/web/src/lib/category-theme.ts`) instead of raw enum values —
  `coming_soon` must render as "Coming Soon", never "coming soon".
- **Sentence case**: prose — descriptions, confirmation messages, hero
  subtext, anything meant to be read as a sentence rather than scanned as
  a label. Don't Title Case a full sentence; it reads wrong.

## Icons

Every catalog module has its own unique emoji in
`packages/db/prisma/modules.catalog.ts` (`icon` field) — verified to have
zero duplicates across all 120. This is what renders on catalog cards, the
module detail header, and the library page. `categoryIcon()` still exists
but is scoped to category *filter pills* only, where sharing an icon
across a whole category is correct. Never use the category icon as a
module's own icon.

## Module component inventory (`@vault/module-ui`)

The baseline "professional app" bar for a module's own content, not the
shell:

- `Button` (`variant: 'primary' | 'secondary' | 'ghost'`) — themed off
  `--module-accent`, with hover lift and a subtle shadow on primary.
- `GatedAction` — a primary `Button` that runs the real action in full
  mode and surfaces the buy wall in preview, showing a small 🔒 while
  gated so it reads as a feature, not a dead button.
- `Input` / `Select` — consistent padding, a focus ring in the module's
  own accent color. Don't drop back to bare `<input>`/`<select>`.
- `Label` — small-caps field label (`AMOUNT`, `FROM`, `TO`, …).
- `Section` — the layout unit for grouping related controls, with an
  optional uppercase title.
- `Divider` — a hairline between sections.
- `StatDisplay` — a large tabular-nums readout for a headline number (a
  conversion result, a running total, a score) plus an optional caption.
- `EmptyState` (optional `icon`) / `LoadingState` (real spinner, not just
  text) — every module handles both; see `modules/CONTRACT.md` #3.

`.module-card` itself carries real depth now — a subtle gradient fill and
drop shadow, not a flat gray box. A module that still looks flat and
unstyled hasn't picked up this baseline yet.

## Where this is enforced

- `modules/CONTRACT.md` — the per-module checklist (data-testid, seed
  data, store-only persistence, gated actions, and now: use these
  components, not raw HTML).
- `scripts/gen-module.ts` — the generator's skeleton already uses
  `Section`/`EmptyState`/`GatedAction` and bakes in the category accent,
  so a freshly scaffolded module starts on this baseline, not behind it.
- `unit-converter` (`modules/unit-converter/`) is the reference
  implementation — when in doubt about how a component should look or
  behave, check how it's used there first.
