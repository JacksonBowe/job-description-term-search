# AGENTS.md

## Project Overview

Quasar BEX (Browser Extension) for Chrome/Firefox. Parses LinkedIn and Seek job listings, scores them against user skills, and injects badges/overlays inline.

## Commands

```bash
# Development (Chrome BEX mode)
pnpm dev          # or: quasar dev -m bex -T chrome

# Lint & Format
pnpm lint         # ESLint with Vue + TypeScript
pnpm format       # Prettier

# Build
pnpm build        # quasar build
```

## Architecture

- **`src/`** - Quasar Vue app (popup UI, Pinia stores, components)
- **`src-bex/`** - Extension-specific code:
  - `background.ts` - Service worker, `chrome.storage` bridge events
  - `my-content-script.ts` - Content script (to be replaced per roadmap)
  - `manifest.json` - Manifest v3, currently runs on `<all_urls>` (restrict to LinkedIn/Seek)

Communication between popup, background, and content scripts uses **Quasar Bridge** (`createBridge`).

## Key Technical Details

- **Manifest v3** - Required for Chrome Web Store
- **Pinia + chrome.storage.local** - Stores sync to extension storage via bridge events
- **CSS injection** - Use `assets/content.css` for injected UI to avoid CSP issues
- **TypeScript strict mode** enabled via `quasar.config.ts`
- **ESLint** uses flat config (`eslint.config.js`) with `@typescript-eslint/consistent-type-imports` enforced

## Roadmap Reference

See `plans/roadmap.md` for detailed implementation phases:

1. Foundation (types, storage, scoring)
2. Site parsers (LinkedIn, Seek content scripts)
3. UI injection (badges, overlays)
4. Popup UI (settings, job list)
5. Integration (bridge events, MutationObserver)

## BEX Development Notes

- Content script entry: `src-bex/my-content-script.ts` (rename to `content-script.ts` per roadmap)
- Bridge events declared via `BexEventMap` interface augmentation
- Storage events: `storage.get`, `storage.set`, `storage.remove` already implemented in background
- Parsers should go in `src-bex/parsers/` (linkedin.ts, seek.ts)
- Injected UI should go in `src-bex/injector/` (badge.ts, overlay.ts)
