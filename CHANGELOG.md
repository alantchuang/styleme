# Changelog

## [Unreleased]

## [0.1.0] — 2026-04-20

### Added
- Wardrobe upload with AI tagging via Claude Haiku (category, colour, season, style)
- Outfit generation with Tinder-style swipe interface via Claude Sonnet
- Weather-aware outfit suggestions via Open-Meteo (no API key required)
- Swipe-trained preference engine — graduates to auto-detect after 20 swipes
- Saved outfits tab with mark-as-worn tracking
- Shopping gap analysis with Pexels product images and Google Shopping links
- Onboarding flow: age gate (13+), body profile, style preferences
- Profile photo analysis — Claude generates a style summary used in outfit prompts
- Account deletion and data export (GDPR / M11)
- Offline support — Convex queues mutations automatically on reconnect
- Aura Elan design system (Material Design 3 tokens, editorial light mode)
- Playwright E2E test suite
- Vitest unit tests (season utils, preference engine, wardrobe validation)
