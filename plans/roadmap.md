# Job Parser BEX - Implementation Roadmap

## Overview

A Quasar Browser Extension (BEX) that automatically detects LinkedIn and Seek job listing pages, parses job descriptions, scores them against your skill profile, and displays color-coded badges with skill breakdowns inline on the page.

### Key Features

- **Automatic detection** of job listing pages on LinkedIn and Seek
- **Inline score badges** with color-coded tiers (excellent/good/poor/avoid)
- **Hover breakdown** showing matched/missing skills
- **Configurable skill categories**: must-haves, nice-to-haves, deal-breakers
- **Blacklist** with warning indicators and score penalties
- **Optional full description parsing** (toggle between card preview and full job details)
- **Persistent configuration** stored in `chrome.storage.local`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Extension Popup (UI)                     │
│  - Configure skills (must-haves, nice-to-haves)             │
│  - Configure blacklist/deal-breakers                         │
│  - View detailed breakdown of current page jobs              │
└─────────────────────────────────────────────────────────────┘
                              │
                    Quasar Bridge (messaging)
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Background Script                         │
│  - Stores config in chrome.storage.local                    │
│  - Coordinates between popup and content scripts            │
└─────────────────────────────────────────────────────────────┘
                              │
                    Quasar Bridge (messaging)
                              │
┌─────────────────────────────────────────────────────────────┐
│                Content Scripts (per site)                    │
│  - linkedin-content.ts: Parse LinkedIn job cards            │
│  - seek-content.ts: Parse Seek job cards                    │
│  - Inject score badges + hover breakdown overlay            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

```typescript
interface SkillConfig {
  mustHaves: WeightedSkill[]; // Required skills (high weight)
  niceToHaves: WeightedSkill[]; // Bonus skills (medium weight)
  dealBreakers: string[]; // Terms that heavily penalize
  blacklist: BlacklistItem[]; // Terms to warn/penalize
}

interface WeightedSkill {
  term: string; // e.g., "TypeScript", "Vue"
  weight: number; // 1-10 scale
  aliases?: string[]; // e.g., ["TS"] for TypeScript
}

interface BlacklistItem {
  term: string;
  behavior: 'warn' | 'penalize'; // Future: could add 'hide'
  penalty: number; // Score reduction
}

interface ParsedJob {
  id: string; // Unique per platform
  title: string;
  company: string;
  description: string;
  url: string;
  platform: 'linkedin' | 'seek';
}

interface ScoredJob extends ParsedJob {
  score: number; // 0-100
  matchedMustHaves: string[];
  missingMustHaves: string[];
  matchedNiceToHaves: string[];
  dealBreakerMatches: string[];
  blacklistMatches: string[];
  tier: 'excellent' | 'good' | 'poor' | 'avoid';
}
```

---

## Scoring Algorithm

```
Base Score = 100

1. Must-Haves (60% weight):
   - Each matched must-have: +points based on weight
   - Each missing must-have: penalty
   - Score portion = (matched_weight / total_must_have_weight) * 60

2. Nice-to-Haves (30% weight):
   - Each matched nice-to-have: +points based on weight
   - Score portion = (matched_weight / total_nice_to_have_weight) * 30

3. Deal-Breakers (-40 each):
   - Each matched deal-breaker: -40 points

4. Blacklist (configurable penalty):
   - Each matched blacklist term: -penalty points

Final Score = clamped(0, 100)

Tiers:
  - Excellent (green): 80-100
  - Good (yellow): 60-79
  - Poor (orange): 40-59
  - Avoid (red): 0-39 or has deal-breaker
```

---

## File Structure

```
src/
├── components/
│   ├── skills/
│   │   ├── SkillInput.vue
│   │   ├── SkillList.vue
│   │   └── SkillCategoryTabs.vue
│   ├── blacklist/
│   │   ├── BlacklistInput.vue
│   │   └── BlacklistList.vue
│   └── jobs/
│       ├── JobCard.vue
│       └── JobBreakdown.vue
├── pages/
│   ├── SettingsPage.vue        (skills + blacklist config)
│   └── JobsPage.vue            (current page results)
├── stores/
│   ├── skillsStore.ts
│   └── blacklistStore.ts
├── services/
│   ├── scorer.ts
│   └── storage.ts              (bridge wrapper for chrome.storage)
└── types/
    └── index.ts                (all TypeScript interfaces)

src-bex/
├── background.ts
├── parsers/
│   ├── linkedin.ts
│   ├── seek.ts
│   └── index.ts                (site detector + router)
├── injector/
│   ├── badge.ts                (inject score badges)
│   └── overlay.ts              (hover breakdown)
└── content-script.ts           (main entry, replaces my-content-script.ts)
```

---

## Implementation Phases

### Phase 1: Foundation (Core Types, Storage, Scoring)

| #   | Task                    | Description                               | Status    |
| --- | ----------------------- | ----------------------------------------- | --------- |
| 1   | Create type definitions | `src/types/index.ts` with all interfaces  | Completed |
| 2   | Create storage service  | Bridge wrapper for `chrome.storage.local` | Completed |
| 3   | Create skills store     | Pinia store with persistence              | Completed |
| 4   | Create blacklist store  | Pinia store with persistence              | Completed |
| 5   | Create scoring service  | Pure scoring function                     | Completed |
| 6   | Update manifest         | Restrict to LinkedIn + Seek domains       | Completed |

### Phase 2: Site Parsers (Content Scripts)

| #   | Task                     | Description                        | Status    |
| --- | ------------------------ | ---------------------------------- | --------- |
| 7   | Site detector utility    | Detect which site we're on         | Completed |
| 8   | LinkedIn parser          | Extract job cards from LinkedIn    | Completed |
| 9   | Seek parser              | Extract job cards from Seek        | Completed |
| 10  | Full description fetcher | Optional fetch of full job details | Deferred  |
| 11  | Main content script      | Orchestrate parsing + scoring      | Completed |

### Phase 3: UI Injection (Inline Display)

| #   | Task           | Description                        | Status    |
| --- | -------------- | ---------------------------------- | --------- |
| 12  | Badge injector | Inject score badges onto job cards | Completed |
| 13  | Hover overlay  | Show skill breakdown on hover      | Completed |
| 14  | Content CSS    | Styles for injected elements       | Completed |

### Phase 4: Popup UI (Configuration)

| #   | Task                  | Description                                     | Status    |
| --- | --------------------- | ----------------------------------------------- | --------- |
| 15  | App layout + routing  | Tab navigation for Settings/Jobs                | Completed |
| 16  | Skills config page    | Manage must-haves, nice-to-haves, deal-breakers | Completed |
| 17  | Blacklist config page | Manage blacklist with penalties                 | Completed |
| 18  | Current jobs page     | View scored jobs from active tab                | Completed |

### Phase 5: Integration & Polish

| #   | Task             | Description                              | Status  |
| --- | ---------------- | ---------------------------------------- | ------- |
| 19  | Bridge events    | Wire up all communication                | Pending |
| 20  | MutationObserver | Handle infinite scroll / dynamic loading | Pending |
| 21  | Error handling   | Graceful failures                        | Pending |
| 22  | Testing          | Manual testing on both sites             | Pending |

---

## Technical Decisions

1. **Manifest v3** - Already configured, required for Chrome Web Store
2. **Pinia + chrome.storage** - Stores sync to extension storage on change
3. **CSS injection** - Use `content.css` for badge/overlay styles to avoid CSP issues
4. **DOM parsing** - Use standard selectors, may need updates if LinkedIn/Seek change their markup
5. **Performance** - Debounce parsing on scroll, cache parsed jobs by URL
6. **Restricted permissions** - Content scripts only run on LinkedIn and Seek domains

---

## Estimated Effort

| Phase                 | Estimated Time |
| --------------------- | -------------- |
| Phase 1: Foundation   | ~2 hours       |
| Phase 2: Site Parsers | ~3 hours       |
| Phase 3: UI Injection | ~2 hours       |
| Phase 4: Popup UI     | ~3 hours       |
| Phase 5: Integration  | ~2 hours       |
| **Total**             | **~12 hours**  |

---

## Future Enhancements

- Export/import config feature
- Keyboard shortcuts for manual rescan
- Additional job sites (Indeed, Glassdoor, etc.)
- Job application tracking
- Score history and analytics
- AI-powered skill extraction from job descriptions
