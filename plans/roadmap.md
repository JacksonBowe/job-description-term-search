# Job Description Term Search (JDTS) - Implementation Roadmap

## Overview

A Quasar Browser Extension (BEX) that automatically detects LinkedIn and Seek job listing pages, parses job descriptions, scores them against your configured terms, and displays results in a side panel UI.

### Key Features

- **Automatic detection** of job listing pages on LinkedIn and Seek
- **Side panel UI** showing score and term breakdown for the current job
- **Configurable term categories**: want, nice-to-have, don't-want
- **Term weights**: low or high priority for each term
- **Alias support**: Match multiple variations of a term (e.g., "TypeScript" or "TS")
- **Scroll-to-term**: Click a matched term to highlight and scroll to it on the page
- **Import/Export**: Save and load term configurations as JSON
- **Persistent configuration** stored in `chrome.storage.local`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Side Panel (UI)                          │
│  - Configure terms (want, nice-to-have, don't-want)         │
│  - View score breakdown for current job                      │
│  - Click terms to scroll to matches on page                  │
└─────────────────────────────────────────────────────────────┘
                              │
                    chrome.runtime messaging
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Background Script                         │
│  - Stores config in chrome.storage.local                    │
│  - Opens side panel on extension click                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    chrome.runtime messaging
                              │
┌─────────────────────────────────────────────────────────────┐
│                Content Scripts (per site)                    │
│  - linkedin.ts: Parse LinkedIn job details                  │
│  - seek.ts: Parse Seek job drawer                           │
│  - Handle scroll-to-term highlighting                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

```typescript
type TermType = 'want' | 'nice-to-have' | 'dont-want';
type TermWeight = 'low' | 'high';

interface Term {
  id: string;
  term: string;
  aliases: string[];
  type: TermType;
  weight: TermWeight;
}

interface ParsedJob {
  title: string;
  company: string;
  description: string;
  url: string;
}

interface MatchedTerm {
  term: Term;
  matchedOn: string; // The actual text that matched
  context: string; // Surrounding text snippet
}

interface ParseResult {
  job: ParsedJob | null;
  foundTerms: MatchedTerm[];
  missingTerms: Term[];
  score: number | null;
  error?: string;
}
```

---

## Scoring Algorithm

```
Base Score = 100%

Bonuses (matched terms):
  - Want (low weight):      +1
  - Want (high weight):     +3
  - Nice-to-have (low):     +1
  - Nice-to-have (high):    +2

Penalties (don't-want matched):
  - Don't-want (low):       -10
  - Don't-want (high):      -25

Final Score = Base + Bonuses - Penalties (clamped to 0-200%)
```

---

## File Structure

```
src/
├── components/
│   ├── SettingsPanel.vue     (term management UI)
│   ├── ResultsPanel.vue      (score and breakdown display)
│   └── TermListItem.vue      (individual term component)
├── layouts/
│   └── SidePanelLayout.vue   (main layout with tabs)
├── stores/
│   └── termsStore.ts         (Pinia store for terms)
├── services/
│   ├── matcher.ts            (scoring algorithm)
│   └── storage.ts            (chrome.storage wrapper)
└── types/
    └── index.ts              (TypeScript interfaces)

src-bex/
├── background.ts             (service worker)
├── content-script.ts         (main content script entry)
├── parsers/
│   ├── index.ts              (site detector + router)
│   ├── linkedin.ts           (LinkedIn parser)
│   └── seek.ts               (Seek parser)
├── assets/
│   └── content.css           (scroll-to-term highlight styles)
└── manifest.json             (Manifest v3)

test/
├── fixtures/
│   └── html/                 (saved job page HTML files)
├── fixtures.json             (URL + expected terms mapping)
├── matcher.test.ts           (scoring logic tests)
└── parsers.test.ts           (parser tests with fixtures)
```

---

## Implementation Status

### Phase 1: Foundation (Core Types, Storage, Scoring)

| #   | Task                    | Description                               | Status    |
| --- | ----------------------- | ----------------------------------------- | --------- |
| 1   | Create type definitions | `src/types/index.ts` with all interfaces  | Completed |
| 2   | Create storage service  | Bridge wrapper for `chrome.storage.local` | Completed |
| 3   | Create terms store      | Pinia store with persistence              | Completed |
| 4   | Create scoring service  | Pure scoring function with term matching  | Completed |
| 5   | Update manifest         | Restrict to LinkedIn + Seek domains       | Completed |

### Phase 2: Site Parsers (Content Scripts)

| #   | Task                | Description                   | Status    |
| --- | ------------------- | ----------------------------- | --------- |
| 6   | Site detector       | Detect which site we're on    | Completed |
| 7   | LinkedIn parser     | Extract job details           | Completed |
| 8   | Seek parser         | Extract job from drawer       | Completed |
| 9   | Main content script | Handle messages + parsing     | Completed |
| 10  | Scroll-to-term      | Highlight and scroll to terms | Completed |

### Phase 3: Side Panel UI

| #   | Task             | Description                     | Status    |
| --- | ---------------- | ------------------------------- | --------- |
| 11  | Layout + routing | Tab navigation (Results/Terms)  | Completed |
| 12  | Results panel    | Score display + term breakdown  | Completed |
| 13  | Settings panel   | Term management + import/export | Completed |
| 14  | Auto-parse       | Parse on load + tab URL changes | Completed |

### Phase 4: Polish & Testing

| #   | Task            | Description                          | Status    |
| --- | --------------- | ------------------------------------ | --------- |
| 15  | Unit tests      | Vitest tests for matcher and parsers | Completed |
| 16  | HTML fixtures   | Test fixtures for parser testing     | Completed |
| 17  | Documentation   | README, LICENSE                      | Completed |
| 18  | Build & release | Verify production build              | Completed |

---

## Technical Decisions

1. **Manifest v3** - Required for Chrome Web Store
2. **Side Panel UI** - Uses Chrome's sidePanel API instead of inline injection
3. **Pinia + chrome.storage** - Terms persist to extension storage on change
4. **DOM parsing** - Uses stable selectors (data-testid, data-automation) with fallbacks
5. **Restricted permissions** - Content scripts only run on LinkedIn and Seek domains
6. **Vitest** - Fast unit testing with happy-dom for DOM testing

---

## Future Enhancements

- Additional job sites (Indeed, Glassdoor, etc.)
- Keyboard shortcuts for manual rescan
- Job application tracking
- Score history and analytics
- AI-powered skill extraction from job descriptions
