# Vault Design Baseline

This is the locked-in design system for the platform, confirmed 2026-07-01
against `unit-converter` and the catalog grid as the reference
implementation — user-confirmed: "let's use that as the bar for the app
UI." Every one of the 120 modules is expected to reach this same bar, not
just compile against `modules/CONTRACT.md`. It covers two layers that are
deliberately kept separate: the **shell** (the store itself — nav,
catalog, buy wall, account pages) and **modules** (the 120 mini-apps).
Every new page or module should read like it already follows this doc,
not like it's improvising.

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

## The module detail page ("product page")

The header above a module's own content (`ModuleDetailClient.tsx`) is
shell content, not module content — it uses `--card-accent` (the
category's default color, same as the catalog card, via `categoryAccent()`)
rather than `--module-accent`, so the icon badge/price panel visually
match how the app was presented in the catalog grid one click ago:

- `.detail-icon-badge` — a large rounded icon tile, same treatment as
  `.product-card .icon` scaled up.
- `.detail-title-row` / `.detail-description` — name + status badge on
  one line, description below.
- `.price-panel` — the one-time price and "or included in All-Access"
  note as a real panel, not a floating sentence.
- `.preview-banner` — this one DOES use `--module-accent` (it's telling
  you about the module you're about to use, not the store), with an icon
  and pill styling instead of plain dim text.

## Module component inventory (`@vault/module-ui`)

The baseline "professional app" bar for a module's own content, not the
shell:

- `Button` (`variant: 'primary' | 'secondary' | 'ghost'`) — themed off
  `--module-accent`, with hover lift and a subtle shadow on primary.
- `IconButton` — a small round button for a row-level action (delete,
  edit), not a primary CTA. `ListRow`'s remove action uses one.
- `GatedAction` — a primary `Button` that runs the real action in full
  mode and surfaces the buy wall in preview, showing a small 🔒 while
  gated so it reads as a feature, not a dead button.
- `Input` / `Select` / `Textarea` — consistent padding, a focus ring in
  the module's own accent color. `Select` draws its own chevron
  (`appearance: none` + a CSS arrow) — native `<select>` arrows are
  inconsistent across browsers and always look out of place in a custom
  dark theme. `Textarea` is a resizable multi-line `Input`. Don't drop
  back to bare `<input>`/`<select>`/`<textarea>`.
- `Label` — small-caps field label (`AMOUNT`, `FROM`, `TO`, …).
- `Tag` (optional `active`, `onClick`) — a small pill for a label. With
  `onClick` it's a clickable filter toggle (renders a `<button>`); without,
  a static label on a list item (renders a `<span>`). Used for anything
  tag/category/label-shaped a module wants to filter or annotate by.
- `Section` — the layout unit for grouping related controls, with an
  optional uppercase title.
- `Divider` — a hairline between sections.
- `SegmentedControl` — an iOS-style tab switcher for picking one of a
  few mutually-exclusive modes/categories. Use this instead of a row of
  loose `Button`s when the options are exclusive (a converter's
  length/weight/temperature switch, a tracker's day/week/month view).
- `StatDisplay` — a headline number in its own inset "readout" panel
  (like a calculator screen), tabular-nums, plus an optional caption.
  Use it for the one number a module's whole point is: a conversion
  result, a running total, a score.
- `ListRow` (optional `onRemove`) — a list item with a consistent hover
  state and, when the data supports it, a trailing delete `IconButton`.
  If a module lets a user add something, give them a way to remove it
  too — add-only lists read as unfinished.
- `EmptyState` (optional `icon`) / `LoadingState` (real spinner, not just
  text) — every module handles both; see `modules/CONTRACT.md` #3.

`.module-card` itself carries real depth — a subtle gradient fill and
drop shadow, not a flat gray box. A module that still looks flat and
unstyled hasn't picked up this baseline yet.

## Where this is enforced

- `modules/CONTRACT.md` — the per-module checklist (data-testid, seed
  data, store-only persistence, gated actions, and now: use these
  components, not raw HTML).
- `scripts/gen-module.ts` — the generator's skeleton already uses
  `Section`/`EmptyState`/`GatedAction` and bakes in the category accent,
  so a freshly scaffolded module starts on this baseline, not behind it.
- `unit-converter` and `quick-note-taker` (`modules/`) are the reference
  implementations — when in doubt about how a component should look or
  behave, check how it's used there first. `unit-converter` covers
  `SegmentedControl`/`Select`/`StatDisplay`; `quick-note-taker` covers
  `Textarea`/`Tag`/multi-line `ListRow` content and a tag-filtered list.
