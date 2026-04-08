# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-08

### Added

- **Term Configuration**: Define skills, keywords, and red flags with customizable weights (low/high)
- **Alias Support**: Add alternate names for terms (e.g., "TypeScript" with alias "TS")
- **Smart Matching**: Word-boundary aware matching that handles special characters (C++, C#, .NET)
- **Scoring System**: Automatic scoring based on matched terms with configurable weights
- **Side Panel UI**: Non-intrusive interface using Chrome's side panel API
- **Click to Highlight**: Click matched terms to scroll and highlight them on the job page
- **Import/Export**: Save and load term configurations as JSON (file or clipboard)
- **Site Support**: LinkedIn Jobs and Seek.com.au parsers
- **Privacy First**: All data stored locally, no external services or analytics

### Technical

- Built with Quasar Framework (Vue 3) in BEX mode
- Manifest V3 compliant
- TypeScript with strict mode
- Vitest test suite with HTML fixture-based parser tests
