# AGENTS.md

## Project Overview

**Job Description Term Search (JDTS)** - A Quasar BEX (Browser Extension) for Chrome/Firefox. Parses LinkedIn and Seek job listings, matches them against user-defined terms (skills, keywords, red flags), and displays scores in a side panel.

## Commands

```bash
# Development (Chrome BEX mode)
npm run dev       # or: quasar dev -m bex -T chrome

# Lint & Format
npm run lint      # ESLint with Vue + TypeScript
npm run format    # Prettier

# Build
npm run build     # quasar build -m bex -T chrome

# Test
npm run test      # Run tests with Vitest
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Architecture

- **`src/`** - Quasar Vue app (side panel UI, Pinia stores, components)
  - `components/` - Vue components (SettingsPanel, ResultsPanel, TermListItem)
  - `services/` - Business logic (matcher.ts for scoring, storage.ts)
  - `stores/` - Pinia stores (termsStore)
  - `types/` - TypeScript type definitions
- **`src-bex/`** - Extension-specific code:
  - `background.ts` - Service worker, chrome.storage bridge, side panel handling
  - `content-script.ts` - Content script for parsing job pages
  - `parsers/` - Site-specific parsers (linkedin.ts, seek.ts)
  - `manifest.json` - Manifest v3, restricted to LinkedIn/Seek domains
- **`test/`** - Test files and fixtures
  - `fixtures/html/` - HTML snapshots of job pages for testing

Communication between side panel, background, and content scripts uses **chrome.runtime messaging** and **Quasar Bridge**.

## Key Technical Details

- **Manifest v3** - Required for Chrome Web Store
- **Side Panel UI** - Uses Chrome's sidePanel API (Firefox: sidebar_action)
- **Pinia + chrome.storage.local** - Terms persist to extension storage
- **TypeScript strict mode** enabled via `quasar.config.ts`
- **ESLint** uses flat config (`eslint.config.js`) with `@typescript-eslint/consistent-type-imports` enforced
- **Vitest** for unit testing with happy-dom environment

## BEX Development Notes

- Content script entry: `src-bex/content-script.ts`
- Bridge events declared via `BexEventMap` interface augmentation
- Storage events: `storage.get`, `storage.set`, `storage.remove` implemented in background
- Parsers in `src-bex/parsers/` (linkedin.ts, seek.ts)
- Site detection based on URL patterns in manifest.json

## Testing

Tests are located in `test/` directory:

- `matcher.test.ts` - Unit tests for scoring logic
- `parsers.test.ts` - Parser tests using HTML fixtures

To add new test fixtures:

1. Save a job page HTML to `test/fixtures/html/`
2. Add entry to `test/fixtures.json` with URL and expected terms
3. Run tests to verify parsing
