# UX Wireframe Specification
**Project:** StyleMe | **Version:** 1.5 | **Date:** March 2026

> Claude Code: implement the component hierarchy exactly as described. Use the specified Tailwind classes. Handle every listed state. Do not invent additional states or copy not in this document.

---

## 1. Design System Tokens

> **Design system: Aura Elan** — high-fashion editorial, light mode. Semantic token names (`bg-primary`, `text-on-surface`, etc.) map to the full Material Design 3 token set defined in `tailwind.config.js`. Key values below.

### Colours

| Token | Value | Tailwind semantic class | Usage |
|-------|-------|------------------------|-------|
| Primary | `#645783` | `bg-primary` / `text-primary` | Buttons, active nav, CTAs, FAB |
| Primary container | `#eadeff` | `bg-primary-container` | FAB gradient end, soft chip bg |
| On-primary | `#ffffff` | `text-on-primary` | Text on primary bg |
| Background | `#fdf8fd` | `bg-background` | Page backgrounds |
| Surface container lowest | `#ffffff` | `bg-surface-container-lowest` | Card bg, accordion bg |
| Surface container low | `#f8f2f8` | `bg-surface-container-low` | Item tile bg |
| Surface container | `#f2ecf2` | `bg-surface-container` | Inner containers, thumbnail bg |
| Surface container high | `#ece6ec` | `bg-surface-container-high` | Inactive filter pill bg |
| On-surface | `#1c1b1f` | `text-on-surface` | Primary text, headings |
| On-surface-variant | `#48464c` | `text-on-surface-variant` | Body text, secondary labels |
| Secondary | `#72575f` | `text-secondary` | Brand labels, muted accents |
| Outline | `#78767c` | `text-outline` / `border-outline` | Borders |
| Outline-variant | `#c9c5cc` | `border-outline-variant` | Subtle dividers |
| Error | `#ba1a1a` | `text-error` | X button, error states |

### Typography

| Role | Font | Size | Weight | Tailwind |
|------|------|------|--------|---------|
| Display / page heading | Noto Serif | 36–40px | 400–700 | `font-headline text-4xl tracking-tight text-on-surface` |
| Section heading | Noto Serif | 24px | 600 | `font-headline text-2xl tracking-tight text-on-surface` |
| Card title | Noto Serif | 18px | 600 | `font-headline text-lg leading-tight text-on-surface` |
| Body | Manrope | 14px | 400 | `font-body text-sm text-on-surface-variant leading-relaxed` |
| Label / tag | Manrope | 10px | 700 | `font-label text-[10px] tracking-widest uppercase` |
| Caption / hint | Manrope | 11px | 400 | `text-[11px] text-on-surface-variant` |
| Nav label | Manrope | 10px | 500 | `font-sans text-[10px] font-medium tracking-wide uppercase` |

Fonts loaded via Google Fonts: `Noto+Serif:ital,wght@0,400;0,700;1,400` and `Manrope:wght@400;500;600;700`.

### Tailwind class reference

| Element | Classes |
|---------|---------|
| Primary button | `bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60` |
| Primary button (gradient) | `bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full px-6 py-3 text-sm font-medium` |
| Ghost button | `border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm` |
| Destructive button | `text-error text-sm font-medium` |
| Standard card | `bg-surface-container-lowest rounded-2xl border border-outline-variant p-4` |
| High priority card | `bg-surface-container-lowest rounded-2xl border-2 border-primary p-4` |
| Active filter pill | `bg-primary text-on-primary rounded-full px-6 py-2 font-label text-xs tracking-widest` |
| Inactive filter pill | `bg-surface-container-high text-on-surface-variant rounded-full px-6 py-2 font-label text-xs tracking-widest` |
| Active occasion chip | `bg-primary text-on-primary rounded-full px-4 py-2 text-sm font-bold` |
| Inactive occasion chip | `border border-primary/30 text-primary rounded-full px-4 py-2 text-sm font-bold` |
| Bottom sheet | `bg-surface-container-lowest rounded-t-3xl fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto` |
| Swipe X button | `w-14 h-14 rounded-full bg-surface-container-lowest text-error flex items-center justify-center shadow-lg` |
| Swipe info button | `w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shadow-md` |
| Swipe heart button | `w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_12px_24px_rgba(100,87,131,0.3)]` |
| Drag handle | `w-10 h-1 bg-outline-variant rounded-full mx-auto mt-3` |
| Reasoning panel | `bg-surface-container-low rounded-2xl p-4` |
| Stat card | `bg-surface-container-low rounded-xl p-3` |
| Loading skeleton | `bg-surface-container-high animate-pulse rounded-2xl` |
| Selected silhouette tile | `flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-primary bg-primary-container cursor-pointer` |
| Unselected silhouette tile | `flex flex-col items-center gap-2 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest cursor-pointer` |
| Other free-text input | `w-full mt-3 border border-outline-variant rounded-full px-4 py-3 text-sm focus:outline-none focus:border-primary` |
| Other input reveal animation | `overflow-hidden transition-all duration-200` (max-h-0 → max-h-24) |

### Persistent layout components

**AppHeader**
- Height: 72px | Background: `bg-white/80 backdrop-blur-xl` | Shadow: `shadow-[0_8px_32px_0_rgba(28,27,31,0.04)]`
- Left: hamburger menu icon — `text-violet-700 material-symbols-outlined`
- Centre: app name "StyleMe" — `font-serif italic text-2xl tracking-tighter text-stone-900`
- Right: account circle icon — `text-violet-700 material-symbols-outlined` — tapping opens ProfileSheet

**BottomNav**
- **Floating pill** — `fixed bottom-6 left-0 right-0 z-50 flex justify-center`
- Inner container: `bg-white/90 backdrop-blur-2xl w-[90%] max-w-md rounded-full px-4 py-2 shadow-[0_20px_50px_rgba(100,87,131,0.1)] flex justify-around items-center`
- 4 tabs: **Closet** | **Outfits** | **Saved** | **Shopping**
- Active tab: `bg-violet-50 text-violet-700 rounded-full py-2 px-5`
- Inactive tab: `text-stone-400 py-2 px-5 hover:text-violet-600`
- Icons: `dresser` (Closet), `style` (Outfits), `favorite` (Saved), `shopping_bag` (Shopping)
- **Safe-area note:** pill sits at `bottom-6` (~24px) + pill height (~52px) = ~76px total. FABs and inline sticky bars must use `pb-28` or `bottom-24` to clear the nav.

---

## 2. Onboarding — 5-step wizard

No AppHeader or BottomNav during onboarding. Full screen layout.

**Shared shell:**
- Progress bar: `h-[3px] bg-violet-600 rounded-full` — width = `(step/4)*100%`, animated
- Step counter: top-right, `text-[11px] text-slate-400` — "Step N of 4"
- Content: `px-6`, scrollable, `pb-24` to clear sticky CTA
- Sticky CTA bar: `fixed bottom-0 w-full bg-white border-t border-slate-100 px-6 py-4`
- Back button (hidden on step 1) + Next/Continue button (violet)

### Step 1 — Sign up
- App name centered, `mt-12`
- Tagline: `text-base text-slate-600 text-center mt-2`
- Email input, password input (with visibility toggle), DOB input — full width, `rounded-xl`
- Divider with "or" + Google sign-in button
- Terms text: `text-[11px] text-slate-400 text-center`
- **Age gate:** if DOB indicates < 13 → show rejection message, do not proceed

### Step 2a — Photo + basic details
- Profile photo: 72px dashed circle, tap opens file/camera. Caption below: `text-[11px] text-slate-400 text-center`
- Height (half-width left) + Age auto-calculated (half-width right, read-only)
- Hair colour + Hair style: full-width inputs
- **Removed:** no weight field

**Location row** (below hair style):
- Label: "Your location" — `text-xs font-medium text-slate-500 uppercase tracking-wide mt-5`
- Caption: `text-[11px] text-slate-400 mt-1` — "Used to show accurate weather for outfit suggestions"
- Primary: "Use my location" button — `flex items-center gap-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-white`
  - Left icon: location pin (16px, slate-400)
  - On tap: calls `navigator.geolocation.getCurrentPosition` → on success: saves lat/lng via `api.users.saveLocation`, button state changes to "✓ Location saved" (`text-violet-700`)
  - On denial: collapses geolocation button, slides down city input
- Fallback city input (shown if geolocation denied or user taps "Enter city instead"):
  - Placeholder: "City name, e.g. London"
  - `border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-violet-400 focus:outline-none`
  - Max 100 characters
  - "Enter city instead" link — `text-[11px] text-violet-600 mt-2` — shown below geolocation button
- **Optional** — "Next" is not disabled if location is skipped. User can always set it later from Edit profile.

### Step 2b — Body silhouette + fit preference _(NEW)_
- **Body silhouette label:** "Which shape is most like yours?" — `text-xs font-medium text-slate-500 uppercase tracking-wide`
- Grid: `grid grid-cols-3 gap-3 mt-3`
- Single-select — no default selection. "Next" disabled until one tile selected.

| Value stored | Display name | Description |
|---|---|---|
| `hourglass` | Hourglass | Shoulders + hips balanced, defined waist |
| `rectangle` | Rectangle | Shoulders, waist + hips similar width |
| `pear` | Pear | Hips wider than shoulders |
| `inverted_triangle` | Inverted triangle | Shoulders wider than hips |
| `apple` | Apple | Fuller around the middle |
| `petite` | Petite | Smaller, compact frame |

> **Illustrations TBD** — use `64×96px rounded-xl bg-slate-100` placeholder tiles during development. Do not ship placeholders.

- **Fit preference label:** "How do you like your clothes to fit?" — `text-xs font-medium text-slate-500 uppercase tracking-wide mt-6`
- Grid: `grid grid-cols-4 gap-2 mt-3`
- Multi-select, max 2. Optional — user can skip.
- If 2 already selected: tapping a third deselects the oldest.

| Value stored | Display name |
|---|---|
| `oversized` | Oversized |
| `relaxed` | Relaxed |
| `fitted` | Fitted |
| `tailored` | Tailored |

### Step 3 — Style preferences
- Label: "My style is..." — above chips
- Chips: flex-wrap, multi-select
- Options: Casual, Minimalist, Classic, Streetwear, Formal, Bold, Boho, Sporty, Romantic, Smart casual
- Minimum 1 required

### Step 4 — First wardrobe item
- Upload zone: `w-full h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mt-4`
- CTA: "Get started" (violet) + "Skip for now" ghost link below

---

## 3. Wardrobe

### Empty state
- Centered flex col: icon (48px `rounded-2xl bg-slate-100`) + title + body + "Add item" CTA

### Filled state
- AppHeader: "My Wardrobe" (screen title in centre serif) + item count as subtitle `text-[10px] tracking-widest text-secondary uppercase`
- Sticky filter row: horizontal scroll, `bg-background/80 backdrop-blur-md overflow-x-auto no-scrollbar`
- Filter pills (rounded-full): All, Tops, Bottoms, Shoes, Outerwear, Dresses, Accessories, Bags
- **Grid: asymmetric 2-column** — `grid grid-cols-2 gap-x-6 gap-y-10`
  - Each tile: `aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-low`
  - Alternating vertical offsets for editorial stagger: col-2 rows get `pt-8` (2nd item) and `pt-12` (4th item), repeating — creates masonry-like rhythm
  - Heart-favourite overlay: `absolute top-3 right-3 bg-white/40 backdrop-blur-md p-2 rounded-full`
  - Brand/category label below image: `text-[10px] tracking-widest text-secondary uppercase mb-1`
  - Item name below label: `text-lg font-headline leading-tight text-on-surface`
- Season dot top-right: green = all-season, amber = seasonal
- Floating add button: `fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full shadow-[0_20px_50px_rgba(100,87,131,0.25)]`

### Item detail sheet
- Slides up, `max-h-[85vh] rounded-t-3xl`
- Image → item name (editable inline) → category + season tags → colour dots → style tags → Edit / Remove actions

---

## 4. Outfits — Cold start picker

Shown when `total_swipes < 20`. ColdStartPicker is the main screen content — no modal.

### Location banner (shown when `needsLocation: true` from `api.weather.get`)

Displayed **above** the ColdStartPicker, below AppHeader. Dismissible per session (not permanently).

```
bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mx-4 mt-3
```

Layout: location pin icon (amber-500, 16px) + text column + "Set location" CTA

- Icon: `text-amber-500 flex-shrink-0`
- Title: "Add your location" — `text-sm font-medium text-amber-900`
- Body: "We'll use it to show accurate weather for your outfits." — `text-xs text-amber-700 mt-0.5`
- CTA: "Set location" — `text-xs font-medium text-violet-700` — taps open `LocationSheet`
- Dismiss: `×` top-right — `text-amber-400` — hides banner for this session only

**`LocationSheet`** — bottom sheet, `max-h-[50vh]`, slides up on "Set location" tap:
- Title: "Your location" — `text-base font-medium text-slate-900`
- Subtitle: "Used to show accurate weather for outfit suggestions" — `text-sm text-slate-400`
- Primary button: "Use my location" — full width violet
  - Calls `navigator.geolocation.getCurrentPosition`
  - On success: saves via `api.users.saveLocation`, sheet closes, banner dismisses, weather fetches immediately
  - On denial: shows city input
- Divider: "or" — `text-xs text-slate-400`
- City input: full-width, placeholder "City name, e.g. London", max 100 chars
- "Save location" CTA: disabled until city has >= 2 characters
  - On tap: saves via `api.users.saveLocation({ locationCity })`, sheet closes, banner dismisses
- "Skip for now" ghost link below CTA — closes sheet, banner remains visible

### Layout
- Title: "What's the occasion?" — `text-base font-medium text-slate-900`
- **Mandatory subtitle:** "We'll handle the weather automatically" — `text-sm text-slate-400 mt-0.5`

### Occasion chips
- Label: "OCCASION" — `text-xs font-medium text-slate-500 uppercase tracking-wide`
- Options: Casual, Work, Date night, Gym, Travel, Smart casual, Other
- Single-select. Default: "Casual" based on time of day.

### "Other" chip + free-text reveal
- On tap: chip activates (violet), all others deselect, text input slides down (`max-h` animation)
- Input: full-width, auto-focus, placeholder "Describe the occasion..."
- Helper text: "e.g. Wedding guest, Job interview, Beach day"
- Max 80 characters
- "Generate outfits" disabled until >= 2 non-whitespace characters
- Tapping any other chip: input collapses and clears

### CTA
- "Generate outfits" — full width, `bg-violet-700 rounded-xl py-3.5 text-sm font-medium mt-6`
- Disabled: `opacity-50 cursor-not-allowed`
- Hint: "AI will auto-detect next time" — `text-[11px] text-slate-400 text-center mt-2`, only when `total_swipes >= 10`

### Empty states

**State A — wardrobe exists, no outfits generated yet:**
- Title: "Ready to style your wardrobe" — `text-lg font-medium text-slate-900`
- Subtitle: "Choose an occasion to get your first outfit ideas"
- ColdStartPicker renders below — same layout, no additional illustration

**State B — no wardrobe items:**
- Centered flex col with icon + "Add some clothes first" + "Go to Wardrobe" CTA

---

## 5. Outfits — Swipe deck (auto-detect mode)

### AppHeader
- Centre: "Today's outfits" — `font-headline text-3xl tracking-tight text-on-background`
- Right: **weather pill** — `bg-secondary-container/50 px-4 py-1.5 rounded-full flex items-center gap-2` — weather icon (`wb_sunny` / `cloud` etc.) + condition + temp (e.g. "Sunny 22°C"). **Informational only — tapping does nothing.** Not shown when weather unavailable.
- Below heading: occasion subtitle — `font-body text-on-surface-variant text-sm`
- ContextPill (occasion override): `bg-surface-container border border-outline-variant/20 rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-secondary` — shows "Occasion ▾". Tapping opens ContextOverrideSheet.

### SwipeStack
- 3 cards visible: back card at `translate-y-4 scale-[0.95] opacity-80 blur-[1px]`, third at `translate-y-8 scale-[0.9] opacity-40 blur-[2px]` (pointer-events-none)
- Top card: interactive, draggable, `z-10`
- Left drag: `rose-500/20` tint + X overlay (opacity proportional to drag distance)
- Right drag: `violet-500/20` tint + heart overlay

### OutfitSwipeCard — Aura Elan editorial layout
- Container: `bg-surface-container-lowest rounded-xl shadow-[0_32px_64px_-16px_rgba(100,87,131,0.15)] overflow-hidden flex flex-col`
- **Hero image (top 2/3):** `relative h-2/3 overflow-hidden` — full-width `object-cover` image, gradient overlay `bg-gradient-to-t from-black/60 to-transparent`, outfit name badge + title overlaid at bottom-left
  - Badge: `bg-primary/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-label tracking-widest uppercase`
  - Title: `font-headline text-white text-2xl`
- **Item thumbnail row (bottom 1/3):** `p-4 flex-1 flex flex-col justify-center gap-4`
  - Horizontal scroll: `flex items-center gap-3 overflow-x-auto no-scrollbar`
  - Each thumbnail: `flex-shrink-0 w-16 h-16 rounded-lg bg-surface-container overflow-hidden`
  - Add-more placeholder: `flex-shrink-0 w-16 h-16 rounded-lg bg-surface-container border-2 border-dashed border-outline-variant flex items-center justify-center`
- **Info expand (info button tap):** reveals full outfit reasoning in a panel below the thumbnail row — `text-[13px] text-on-surface-variant italic leading-relaxed`, info button rotates 180°

### Action buttons
- `flex justify-center items-center gap-8 mt-8`
- X: `w-14 h-14 rounded-full bg-surface-container-lowest text-error shadow-lg` (see Tailwind class reference)
- Info (centre): `w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface-variant shadow-md` — tapping expands/collapses outfit reasoning inline (see Info expand above)
- Heart: `w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_12px_24px_rgba(100,87,131,0.3)]` (see Tailwind class reference)

### Progress dots
- Active: `w-4 h-1.5 rounded-full bg-violet-700`
- Inactive: `w-1.5 h-1.5 rounded-full bg-slate-300`

### Outfit generation loading state

Applies on both initial batch load (user taps "Generate outfits") and post-5th-swipe batch refresh. Same component, same behaviour both times.

1. 3 skeleton cards (`bg-slate-100 animate-pulse rounded-3xl`) appear immediately
2. A single status message renders below the skeletons — `text-[12px] text-slate-400 text-center`
3. Message cycles through `OUTFIT_LOADING_MESSAGES` in order, looping, every 1.8s with a 200ms fade transition between messages
4. Action buttons **hidden**
5. Progress dots **hidden**
6. New batch fades in when ready

On failure: skeletons → error card ("Couldn't load new outfits") + "Try again" ghost button

### Batch transition (after 5th swipe)
1. 5th card exits normally
2. Outfit generation loading state activates (see above)
3. New batch fades in when ready
4. **Cannot go back** to previous cards

### ContextOverrideSheet
- `rounded-t-3xl max-h-[75vh]` — shorter than other sheets (occasion only)
- Title: "Change occasion" | Subtitle: "Weather is detected automatically"
- Same occasion chips + Other chip + free-text
- Current occasion pre-selected on open
- CTA: "Update outfits"
- On submit: sheet closes, skeletons show with "Generating new outfits for [occasion]...", fresh batch loaded

---

## 6. Saved outfits

### Accordion list
- Each row: `bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(100,87,131,0.05)]`
- **Collapsed header:** `px-6 py-5 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer`
  - Left: outfit name (`text-xl font-headline text-on-surface`) + occasion badge chip below
  - Right: `keyboard_arrow_down` icon (`text-outline`)
- **Expanded header:** same layout, arrow flips to `keyboard_arrow_up`, bg `bg-surface-container-low`
- **Expanded body:** `p-6`
  - Item grid: 2-col — left: single `aspect-[3/4] rounded-lg overflow-hidden`; right: 2 stacked `aspect-square rounded-lg overflow-hidden` with `gap-4`
  - CTA below grid: "Mark as worn today" — full-width `bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full py-4 font-bold text-sm tracking-widest uppercase`
- Only one accordion row open at a time — opening one collapses the previous

### Occasion badge colours
| Occasion | Classes |
|----------|---------|
| Casual / Weekend | `bg-secondary-container text-on-secondary-container` |
| Work / Smart casual | `bg-primary-container text-on-primary-container` |
| Date night / Evening | `bg-tertiary-container text-on-tertiary-container` |
| Gym / Sport | `bg-surface-container-high text-on-surface-variant` |

All badges: `inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase mt-1`

### SavedOutfitDetail (expanded accordion panel)
- Reasoning always visible in expanded state
- Worn dates as chips: `text-[11px] bg-surface-container rounded-full px-3 py-1`
- "Mark as worn today" CTA adds today to `worn_on[]`
- "Remove" button (destructive, bottom of expanded panel) — `text-error text-sm font-medium` — unsaves outfit, row disappears reactively

---

## 7. Shopping

### Empty state (< 10 swipes)
- Icon + "Not enough data yet" + body + progress bar + "Go to Outfits" CTA
- Progress bar: `w-full h-1.5 bg-slate-100 rounded-full` — filled portion `bg-violet-400`

### Active state
- AppHeader: "Shopping" + "Updated X ago" right-aligned
- **WardrobeSnapshot bar:** `bg-slate-50 border-b border-slate-100 px-4 py-3` — 3 stat cells: Gaps found (violet-700), Occasions, Items
- **Filter pills:** All gaps / High priority / By occasion
- **Sort:** season_relevance (current first) → priority (high first) → `affected_occasions.length` desc

### Regenerating state
Triggered immediately when `isStale: true` is detected on tab open or when wardrobe/swipe change is detected.

1. All existing gap cards removed immediately — never shown at reduced opacity
2. WardrobeSnapshot bar **hidden**
3. Filter pills **hidden**
4. AppHeader right slot: no "Updated X ago" — empty
5. A sequential thinking steps component renders in the card area:
   - Steps drawn from `SHOPPING_LOADING_STEPS` in order
   - Each step starts with `▸` (active, `text-slate-900 font-medium`) and transitions to `✓` (completed, `text-violet-700 font-medium`) when the next step activates
   - Steps activate one at a time, 2s apart
   - After "Almost ready..." activates, the sequence loops back to step 1 if regeneration is still in progress
   - Step text: `text-[13px]`, left-aligned, `gap-2` between icon and text
6. On completion: thinking steps replaced by fresh gap cards; WardrobeSnapshot and filter pills reappear

### GapCard — editorial vertical list
- Layout: `space-y-12` between cards (generous breathing room)
- Each card:
  - Hero image: `relative mb-6 overflow-hidden rounded-xl bg-surface-container` — `aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-105`
  - Priority badge overlay: `absolute top-4 left-4 px-4 py-1 rounded-full text-[10px] font-label uppercase tracking-widest`
  - Title below image: `text-2xl font-headline font-bold text-on-surface`
  - Reasoning text: `text-on-surface-variant text-sm leading-relaxed mb-6`
  - CTA: full-width `rounded-full`
- **Priority badge classes:**
  - High Priority: `bg-primary text-on-primary`
  - Core Essential: `bg-secondary-container text-on-secondary-container`
  - Seasonal Update: `bg-tertiary-container text-on-tertiary-container`
- **CTA classes:**
  - High Priority: `bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-full font-label text-xs uppercase tracking-widest shadow-[0_12px_24px_rgba(100,87,131,0.15)]`
  - Core Essential / Seasonal Update: `bg-surface-container-lowest text-on-surface border border-outline-variant/15 py-4 rounded-full font-label text-xs uppercase tracking-widest hover:bg-surface-container`
- No "Level" labels — priority badge is the only priority indicator

### GapDetail (full-screen page, not a sheet)
- Back arrow + gap name in AppHeader
- Priority badge + season badge (In season / Coming up / Off season) + occasion tags
- Reasoning panel: `bg-violet-50 rounded-2xl p-4` — full text, no truncation
- Compatible items: horizontal scroll of colour swatches (`dominant_colour_hex` background)
- Search query: `font-mono text-sm` + copy button
- CTA: "Open Google Shopping" — opens new browser tab

---

## 8. Profile sheet

- Overlay: `bg-black/40 fixed inset-0`
- Sheet: `bg-white rounded-t-3xl fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto`
- Drag handle → user header (avatar + name + item/outfit count) → stat cards (2×2 grid) → Style DNA section → menu rows

### Style DNA
- `summary_sentence`: `text-[13px] text-slate-600 italic`
- `liked_styles` pills: `bg-violet-50 text-violet-800 text-xs font-medium rounded-full px-3 py-1`
- If empty: "Swipe more outfits to reveal your style DNA"

### Menu rows
- Edit profile → full-screen Edit profile page
- Privacy and data
- Sign out — `text-rose-500`

---

## 8a. Edit profile (full-screen page)

- AppHeader: back arrow + "Edit profile" + "Save" (right, `text-violet-700`, disabled until dirty)
- Fields (scrollable): Profile photo, Display name, Height, Hair colour, Hair style, Style preferences, Body silhouette (pre-selected), Fit preferences (pre-selected), Hemisphere
- Save: `useMutation(api.users.updateProfile)` with changed fields only → "Profile updated" toast on success → navigate back
- Save failure: inline error below Save button ("Couldn't save — try again")

---

## 9. Interaction states — master reference

| Screen | State | Behaviour |
|--------|-------|-----------|
| All | Loading | Skeleton placeholders (`animate-pulse bg-slate-100`) — no blank screens |
| All | Error | Friendly error card + "Try again" ghost button — no raw error strings |
| All | No network | Amber "You're offline" banner at top |
| All | Reconnected | "Syncing..." toast, queued actions flushed |
| All | Claude slow (>5s) | "Taking a little longer..." after 3s |
| All | Claude failed | Friendly error card + "Try again" |
| Closet | Empty | Icon + title + "Add item" CTA |
| Closet | Item uploading | Tile shows spinner, fades in on complete |
| Outfits | Empty — wardrobe has items | ColdStartPicker with "Ready to style your wardrobe" |
| Outfits | Empty — no wardrobe | "Add some clothes first" + "Go to Wardrobe" CTA |
| Outfits | No location set | Amber location banner above ColdStartPicker — "Add your location" |
| Outfits | LocationSheet open | Bottom sheet with geolocation button + city input |
| Outfits | Location saved | Banner dismisses, weather fetches immediately |
| Outfits | Batch loading | 3 skeleton cards + rotating `OUTFIT_LOADING_MESSAGES` (cycles every 1.8s, 200ms fade) |
| Outfits | Swipe right | Card exits right + violet overlay fades |
| Outfits | Swipe left | Card exits left + rose overlay fades |
| Outfits | Info expanded | Caption bg → violet-50, full reasoning, icon rotates 180° |
| Outfits | Post-5th-swipe | 3 skeleton cards + rotating `OUTFIT_LOADING_MESSAGES`, action buttons hidden |
| Outfits | Batch failed | Error card replaces skeletons + "Try again" |
| Outfits | Context override | Sheet closes, skeletons + "Generating new outfits for [occasion]..." |
| Saved | Empty | Heart icon + "No saved outfits yet" + "Go to outfits" CTA |
| Saved | Mark worn | Confetti micro-animation, date added to worn chips |
| Shopping | Empty (< 10 swipes) | Progress bar + "Go to Outfits" CTA |
| Shopping | Regenerating | Old cards removed immediately, `SHOPPING_LOADING_STEPS` thinking steps shown (▸ active / ✓ completed, 2s per step, loops) |
| Shopping | No gaps found | Checkmark + "Your wardrobe looks well-rounded!" |
| Profile | No style DNA | Hint replaces pills |
| Edit profile | No changes | "Save" button disabled |
| Edit profile | Save success | "Profile updated" toast + navigate back |
| Edit profile | Save failed | Inline error, stay on edit screen |
| Silhouette step 2b | No selection | "Next" disabled |
| Silhouette step 2b | Selected | `border-2 border-violet-600 bg-violet-50` |
| Fit step 2b | 2 selected + tap 3rd | Oldest deselects |
| Cold start | Other tapped | Free-text slides down, auto-focuses |
| Cold start | Other + empty | CTA disabled |

---

## 10. Copy reference

> All user-facing strings. Claude Code must use these exact strings — do not invent copy.

### Onboarding

| Component | String | Context |
|-----------|--------|---------|
| App tagline | Your AI stylist that learns what you love | Below app name, step 1 |
| Step counter | Step N of 4 | Top-right every onboarding screen |
| Profile photo caption | Helps the AI style outfits for you | Below photo upload circle |
| Style chips label | My style is... | Above style chips |
| Silhouette label | Which shape is most like yours? | Above silhouette tiles |
| Fit label | How do you like your clothes to fit? | Above fit tiles |
| First item title | Add your first item | Step 4 heading |
| First item subtitle | Take a photo of any clothing item to get started | Step 4 body |
| Skip link | Skip for now | Below "Get started" CTA on step 4 |
| Age rejection | You must be 13 or older to use StyleMe | DOB < 13 |
| Location section label | Your location | Above location row in step 2a |
| Location caption | Used to show accurate weather for outfit suggestions | Below label |
| Geolocation button | Use my location | Primary location button |
| Geolocation success | ✓ Location saved | After geolocation succeeds |
| City fallback link | Enter city instead | Below geolocation button |
| City placeholder | City name, e.g. London | City input placeholder |

### Wardrobe

| Component | String | Context |
|-----------|--------|---------|
| Empty title | Add your first item | Wardrobe empty state |
| Empty body | Take a photo or upload from your camera roll | Wardrobe empty state |
| Empty CTA | Add item | Primary button |
| Add button | Add item | Floating button above BottomNav |
| Inactive badge | Stored | Badge on inactive tiles |

### Outfits — cold start

| Component | String | Context |
|-----------|--------|---------|
| ColdStartPicker title | What's the occasion? | Above chips |
| ColdStartPicker subtitle | We'll handle the weather automatically | Mandatory — do not remove |
| Occasion label | Occasion | Uppercase label above chips |
| Other placeholder | Describe the occasion... | Free-text input |
| Other helper | e.g. Wedding guest, Job interview, Beach day | Helper text |
| Generate CTA | Generate outfits | Primary button |
| Auto-detect hint | AI will auto-detect next time | Below CTA, total_swipes >= 10 |
| `OUTFIT_LOADING_MESSAGES[0]` | Reading your wardrobe... | Rotating loading message 1/5 |
| `OUTFIT_LOADING_MESSAGES[1]` | Checking today's weather... | Rotating loading message 2/5 |
| `OUTFIT_LOADING_MESSAGES[2]` | Applying your style preferences... | Rotating loading message 3/5 |
| `OUTFIT_LOADING_MESSAGES[3]` | Building outfit combinations... | Rotating loading message 4/5 |
| `OUTFIT_LOADING_MESSAGES[4]` | Adding finishing touches... | Rotating loading message 5/5 |
| Ready state title | Ready to style your wardrobe | Outfits empty state A |
| Ready state subtitle | Choose an occasion to get your first outfit ideas | Outfits empty state A body |
| No wardrobe title | Add some clothes first | Outfits empty state B |
| No wardrobe body | Upload a few wardrobe items and we can start styling outfits for you. | Outfits empty state B |
| No wardrobe CTA | Go to Wardrobe | Outfits empty state B button |
| Location banner title | Add your location | Amber banner above ColdStartPicker |
| Location banner body | We'll use it to show accurate weather for your outfits. | Banner description |
| Location banner CTA | Set location | Opens LocationSheet |
| LocationSheet title | Your location | Sheet heading |
| LocationSheet subtitle | Used to show accurate weather for outfit suggestions | Sheet subheading |
| LocationSheet geolocation button | Use my location | Primary sheet button |
| LocationSheet city placeholder | City name, e.g. London | City input |
| LocationSheet save CTA | Save location | City input submit |
| LocationSheet skip | Skip for now | Ghost link below CTA |

### Outfits — swipe deck

| Component | String | Context |
|-----------|--------|---------|
| Page title | Today's outfits | AppHeader |
| Batch refresh text | Refreshing your suggestions... | Below skeleton cards |
| Context override text | Generating new outfits for [occasion]... | Batch refresh after context change |
| Batch error | Couldn't load new outfits | Error card title |
| Batch retry | Try again | Error card button |
| Override sheet title | Change occasion | ContextOverrideSheet heading |
| Override sheet subtitle | Weather is detected automatically | ContextOverrideSheet subheading |
| Override CTA | Update outfits | ContextOverrideSheet button |

### Saved outfits

| Component | String | Context |
|-----------|--------|---------|
| Page title | Saved outfits | AppHeader |
| Empty title | No saved outfits yet | Saved tab empty state |
| Empty body | Swipe right on outfits you love | Empty state description |
| Empty CTA | Go to outfits | Empty state button |
| Prompt card | Swipe right to save more outfits | Dashed card at bottom of list |
| Worn CTA | Mark as worn today | SavedOutfitDetail button |

### Shopping

| Component | String | Context |
|-----------|--------|---------|
| Page title | Shopping | AppHeader |
| Snapshot — gaps | Gaps found | WardrobeSnapshot label |
| Snapshot — occasions | Occasions | WardrobeSnapshot label |
| Snapshot — items | Items | WardrobeSnapshot label |
| Empty title | Not enough data yet | < 10 swipes |
| Empty body | Swipe through a few outfit ideas first — the AI will start spotting your wardrobe gaps. | Empty state description |
| Empty CTA | Go to Outfits | Empty state button |
| No gaps title | Your wardrobe looks well-rounded! | Positive empty state |
| Gap CTA (all priorities) | Find on Google Shopping | Gap card button |
| Detail reasoning label | Why this was recommended | GapDetail panel label |
| Detail items label | Works with items you own | Compatible items label |
| Detail query label | Search query | Search query section |
| Detail query hint | Edit the search before opening if you want different results | Below search query |
| Detail CTA | Open Google Shopping | GapDetail primary button |
| Detail CTA hint | Opens in your browser | Below GapDetail CTA |
| Season badge — current | In season | `season_relevance = current` |
| Season badge — upcoming | Coming up | `season_relevance = upcoming` |
| Season badge — off | Off season | `season_relevance = off-season` |
| `SHOPPING_LOADING_STEPS[0]` | Reviewing what you own... | Thinking step 1/5 |
| `SHOPPING_LOADING_STEPS[1]` | Spotting the gaps... | Thinking step 2/5 |
| `SHOPPING_LOADING_STEPS[2]` | Matching to your style... | Thinking step 3/5 |
| `SHOPPING_LOADING_STEPS[3]` | Prioritising your needs... | Thinking step 4/5 |
| `SHOPPING_LOADING_STEPS[4]` | Almost ready... | Thinking step 5/5 |
| Regeneration error | Couldn't refresh your recommendations | Shopping regeneration failure |

### Profile sheet

| Component | String | Context |
|-----------|--------|---------|
| Style DNA label | Style DNA | ProfileSheet section label |
| No DNA hint | Swipe more outfits to reveal your style DNA | preference_summary empty |
| Stats — swipes | Swipes | Stat card label |
| Stats — liked | Liked | Stat card label |
| Stats — items | Items | Stat card label |
| Stats — score | Style score | Stat card label |
| Menu — edit | Edit profile | ProfileSheet menu row |
| Menu — privacy | Privacy and data | ProfileSheet menu row |
| Menu — sign out | Sign out | ProfileSheet menu row (rose-500) |
| Edit page title | Edit profile | AppHeader on edit screen |
| Edit save button | Save | AppHeader right button |
| Edit save toast | Profile updated | Toast on success |
| Edit save error | Couldn't save — try again | Inline error below Save button |

### Global / system

| Component | String | Context |
|-----------|--------|---------|
| Generic error | Something went wrong | Default error heading |
| Generic retry | Try again | Error state button |
| Connectivity error | Check your connection and try again later | Second-attempt failure |
| Offline banner | You're offline | Amber banner |
| Reconnecting toast | Syncing... | Brief toast on reconnect |
| Claude slow | This is taking a little longer than usual... | Progress indicator after 3s |
| Upload toast | Item uploaded | After successful wardrobe upload |
| Save toast | Outfit saved | After outfit saved from swipe deck |

---

## 11. Privacy & Data screen

Accessible from ProfileSheet → "Privacy and data" row. Full-screen page, not a sheet.

### AppHeader
- Back arrow + "Privacy & data" title

### Layout (scrollable, `px-6 py-4`)

**What we store section**
- Label: "WHAT WE STORE" — `text-xs font-medium text-slate-500 uppercase tracking-wide`
- Card: `bg-white rounded-2xl border border-slate-100 p-4 mt-3`
- Bulleted list in `text-[13px] text-slate-600 leading-relaxed`:
  - Wardrobe photos (stored privately in Convex Storage)
  - Profile photo (analysed once, stored as a text description)
  - Height, hair colour, body silhouette
  - Style and fit preferences
  - Daily location (used for weather only, cached 30 minutes)
  - Outfit swipe history (used to personalise suggestions)
  - Age and date of birth

**Our commitment section**
- Label: "OUR COMMITMENT" — same label style, `mt-6`
- Card: same card style
- Three rows with checkmark icon (`text-violet-700`) + text:
  - "Your data is never sold or shared with third parties"
  - "Your data is never used to train AI models"
  - "You can delete everything at any time"

**Download your data section**
- Label: "YOUR DATA" — same label style, `mt-6`
- "Download my data" — ghost button, full width
  - On tap: calls `api.users.exportData`, triggers JSON file download
  - Loading state: button shows spinner + "Preparing your data..."
  - Success: browser downloads `styleme-data.json`

**Delete account section**
- Label: "DANGER ZONE" — `text-xs font-medium text-rose-500 uppercase tracking-wide mt-6`
- Card: `bg-rose-50 rounded-2xl border border-rose-100 p-4 mt-3`
- Body: "Permanently delete your account and all data. This cannot be undone." — `text-[13px] text-rose-700`
- "Delete my account" — `text-rose-500 text-sm font-medium border border-rose-200 rounded-xl px-6 py-3 w-full mt-3`
- On tap: confirmation sheet appears

**Delete confirmation sheet**
- `rounded-t-3xl max-h-[50vh]`
- Drag handle
- Title: "Delete your account?" — `text-base font-medium text-slate-900`
- Body: "This will permanently delete your wardrobe, outfits, style history, and account. This cannot be undone." — `text-[13px] text-slate-600 mt-2`
- "Yes, delete everything" — full width, `bg-rose-500 text-white rounded-xl px-6 py-3 text-sm font-medium mt-4`
  - On tap: calls `api.users.deleteAccount`, shows progress ("Deleting your data..."), on success redirects to `/sign-in?deleted=true`
  - Sign-in page detects `?deleted=true` and shows: "Your account has been deleted."
- "Cancel" — ghost button below

### Interaction states

| State | Behaviour |
|-------|-----------|
| Download loading | Button shows spinner + "Preparing your data..." |
| Download success | Browser file download triggers automatically |
| Download failed | "Couldn't prepare your data — try again" below button |
| Delete confirmation | Sheet slides up, main content dims |
| Delete in progress | Sheet shows spinner + "Deleting your data..." — cannot dismiss |
| Delete success | Redirect to `/sign-in?deleted=true` |
| Delete failed | "Couldn't delete your account. Please try again or contact support." — sheet stays open |
| Offline | Both buttons disabled, amber "You're offline" banner shown |

### Copy strings

| Component | String |
|-----------|--------|
| Page title | Privacy & data |
| What we store label | What we store |
| Commitment label | Our commitment |
| Commitment 1 | Your data is never sold or shared with third parties |
| Commitment 2 | Your data is never used to train AI models |
| Commitment 3 | You can delete everything at any time |
| Your data label | Your data |
| Download button | Download my data |
| Download loading | Preparing your data... |
| Danger zone label | Danger zone |
| Danger zone body | Permanently delete your account and all data. This cannot be undone. |
| Delete button | Delete my account |
| Confirmation title | Delete your account? |
| Confirmation body | This will permanently delete your wardrobe, outfits, style history, and account. This cannot be undone. |
| Confirmation CTA | Yes, delete everything |
| Cancel | Cancel |
| Deleting progress | Deleting your data... |
| Deleted message | Your account has been deleted. |
| Delete failed | Couldn't delete your account. Please try again or contact support. |
| Photo disclosure | Your photo is analysed once to help style outfits for you. It is never shared or used to train AI. |
| Wardrobe disclosure | Photos are stored privately and only used to generate outfit suggestions for you. |
| Consent — terms | I agree to the Terms of Service |
| Consent — privacy | I agree to the Privacy Policy |
