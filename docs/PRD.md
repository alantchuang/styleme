# Product Requirements Document
**Project:** StyleMe — AI-Powered Wardrobe Assistant  
**Version:** 1.6 | **Date:** March 2026

---

## 1. Problem Statement

People own more clothes than they wear. StyleMe acts as a personal AI stylist that knows your wardrobe, your body, your preferences, and your day — and gets smarter every time you interact with it.

---

## 2. Target Users

**Primary segment A — Fashion-conscious young women, ages 13–24**
- Minimum age: 13. No under-13 flow.
- Heavy social media users with strong trend awareness
- Fashion as identity and self-expression
- Ages 13–17: app language and imagery must remain age-appropriate. No weight-focused messaging, no adult content.

> **Compliance note:** COPPA (US) does not apply to users 13 and over. However, GDPR in Europe (Article 8) sets the age of digital consent at 16 in many member states — users aged 13–15 in those jurisdictions may require parental consent. v1 targets 13+ globally without parental consent flows; under-16 European compliance is a **v2 consideration**. Legal review required before launching to European markets.

**Primary segment B — Fashion-conscious adults, ages 25–40**
- Own a significant wardrobe but struggle with daily outfit decisions
- Value time-saving; want AI to handle decision fatigue

**Secondary — Capsule wardrobe builders (any age 13+)**
- Want to buy less but better — AI guides what to add

---

## 3. Goals

- Reduce daily outfit decision time
- Increase utilisation of existing wardrobe items
- Build a continuously improving preference model per user via swipe interactions
- Surface genuine wardrobe gaps with AI-generated shopping recommendations
- Respect seasonality — only suggest relevant items for the current season

---

## 4. Non-Goals (v1)

- No social sharing or community features
- No direct in-app purchasing — Google Shopping links only
- No AR / virtual try-on
- No outfit scheduling / calendar
- No live fashion trend data feed — season signal only

---

## 5. Navigation Structure

```
Bottom nav: Wardrobe | Outfits | Saved | Shopping
Header: Profile avatar (top-right) → opens Profile slide-over panel
```

---

## 6. Core Features

### 6.1 Wardrobe Inventory
- Upload photos of individual clothing items
- Auto-tag items by category, colour, style, and season using Claude vision
- Season tags: `summer` / `winter` / `all-season` — assigned by Claude, user-editable
- Mark items as active / inactive

### 6.2 User Profile
- **Profile photo** — optional. Analysed once on upload by Claude, stored as a text summary. Not re-sent on every outfit call.
- **Height** — e.g. 165 cm
- **Hair colour and hair style** — free text
- **Style preferences** — multi-select chips
- **Body silhouette** — visual 6-option selector
- **Fit preferences** — visual 4-option selector, max 2 selections
- **Location** — requested during onboarding (step 2a). Two methods: browser geolocation (primary) and city name text input (fallback if geolocation denied). Used exclusively for weather fetching. Optional — user can skip and set later from Edit profile.

### 6.3 Outfit Generation — Swipe UX

**Weather — always auto-detected:**
- Fetched on every session open via Open-Meteo (no API key required), cached 30 minutes on the user document in Convex
- Requires user location (lat/lng or city name). If location not set, an amber banner prompts the user to add it — the app still works without it, falling back to season + wardrobe tags
- Never user-entered for current conditions. Failure or missing location: Claude proceeds gracefully.

**Cold start picker (totalSwipes < 20) — occasion only:**
- Chips: Casual, Work, Date night, Gym, Travel, Smart casual, Other
- "Other" chip reveals a free-text input — max 80 characters, sanitised before sending to Claude
- "Generate outfits" CTA disabled until occasion selected or Other field has >= 2 non-whitespace characters
- Hint text: "AI will auto-detect next time" — shown only when `totalSwipes >= 10`

**Auto-detect mode (20+ swipes):**
- Cold start skipped — context pill shown inline
- Context pill tappable to change occasion (weather always auto-detected, never user-overridable)
- Changing occasion: starts fresh batch. Already-swiped cards are logged — preference learning preserved.

**Swipe deck batch transition (after 5th swipe):**
- 3 skeleton cards appear immediately
- Rotating `OUTFIT_LOADING_MESSAGES` below skeletons (5 messages, 1.8s cycle, 200ms fade)
- New batch loads in place — no navigation
- User cannot go back to previously swiped cards

**Outfits empty states:**
- State A — wardrobe exists, no outfits: ColdStartPicker inline with "Ready to style your wardrobe"
- State B — wardrobe empty: "Add some clothes first" + "Go to Wardrobe" CTA

### 6.4 Preference Learning
- Every swipe stored with outfit metadata
- Preference summary maintained per user — injected into every Claude prompt
- Recalculated by Claude every 5 swipes (async, non-blocking)
- Existing summary merge preserves long-term preferences beyond the 20-swipe window

### 6.5 Weather Integration
- Auto-detected from user location — never user-entered
- Cached 30 minutes in Convex on the user document (persists across page navigations)
- Failure: Claude proceeds with season + wardrobe tags

### 6.6 Shopping Tab — Wardrobe Gap Analysis
- Three states: empty (< 10 swipes), active gap list, gap detail screen
- Gap list is a reactive Convex query — auto-updates when wardrobe or swipes change
- Google Shopping CTA: opens browser with pre-built search query

---

## 7. Offline and Degraded Connectivity

**Tier 1 — Claude API slow (> 5 seconds):**
- "This is taking a little longer than usual..." after 3s
- Exception: outfit generation and shopping regeneration have dedicated progress UI — slow indicator does not apply to those two flows

**Tier 2 — Claude API fails:**
- Friendly error card + "Try again" (one retry), then "Check your connection"

**Tier 3 — No network (Convex offline):**
- Amber "You're offline" banner via Convex `connectionState`
- Convex mutations (swipes, saves) queue automatically and replay on reconnect
- "Syncing..." toast briefly shown on reconnect

---

## 8. Season Signal

| Season | Northern hemisphere | Southern hemisphere |
|--------|--------------------|--------------------|
| Spring | March–May | September–November |
| Summer | June–August | December–February |
| Autumn | September–November | March–May |
| Winter | December–February | June–August |

---

## 9. Cold Start Trigger Logic

| Condition | Behaviour |
|-----------|-----------|
| 0–9 swipes | Cold start picker (occasion only). Shopping tab: empty state. |
| 10–19 swipes | Cold start picker + hint text. Shopping may show early gaps. |
| 20+ swipes | Auto-detect mode. Shopping tab fully active. |
| Weather API fails | Proceed without weather. Claude uses season + wardrobe tags. Never block. |
| "Other" occasion | Free-text field shown. Sanitised before sending to Claude. |

---

## 10. Success Metrics

| Metric | Target (30 days) | Target (90 days) |
|--------|-----------------|-----------------|
| Wardrobe items added per user | 15+ | 30+ |
| Swipes per active user / week | 10+ | 20+ |
| Cold start graduation rate | 60% reach 20 swipes | 80% reach 20 swipes |
| Right-swipe rate | 35%+ | 50%+ |
| Shopping tab visits / week | 2+ | 3+ |
| Google Shopping CTA tap rate | 20%+ of gap cards | 30%+ of gap cards |
| 7-day retention | 40% | 55% |
