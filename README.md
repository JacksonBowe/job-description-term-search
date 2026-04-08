![Example Image](example.png 'Job Description Term Search')

# Job Description Term Search (JDTS)

A browser extension that helps you quickly evaluate job postings by searching for terms you care about. Configure skills you want, nice-to-haves, and red flags - then get instant scores when browsing jobs on LinkedIn and Seek.

Video showcasing it [here](https://www.linkedin.com/posts/jackson-bowe-a43103223_i-built-a-chrome-extension-to-make-job-searching-ugcPost-7447475235626549248-TwPx?utm_source=share&utm_medium=member_desktop&rcm=ACoAADgUFhMB3cdKLj0NZzABB_vSDFLimTVSrjM)

## Features

- **Configurable Terms** - Add skills, keywords, and red flags with customizable weights
- **Smart Matching** - Handles aliases (e.g., "TypeScript" or "TS"), special characters (C++, C#, .NET), and word boundaries
- **Instant Scoring** - See at a glance how well a job matches your criteria
- **Side Panel UI** - Non-intrusive interface that doesn't clutter the job page
- **Click to Highlight** - Click any matched term to scroll and highlight it on the page
- **Import/Export** - Save and share your term configurations as JSON
- **Privacy First** - All data stays in your browser, no external services

## Supported Sites

- LinkedIn Jobs (`linkedin.com/jobs/*`)
- Seek (`seek.com.au/*`)

## Installation

### From Source (Development)

1. Clone the repository:

   ```bash
   git clone https://github.com/JacksonBowe/job-description-term-search.git
   cd job-description-term-search
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/bex` folder

5. Load in Firefox:
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `dist/bex` folder

## Usage

1. **Click the extension icon** when on a LinkedIn or Seek job page to open the side panel

2. **Add terms** in the "Terms" tab:
   - **Want**: Skills you're looking for (green = good)
   - **Nice to have**: Bonus skills (adds to score)
   - **Don't want**: Red flags (reduces score significantly)

3. **Set weights**:
   - **Low**: Smaller impact on score
   - **High**: Larger impact on score

4. **Add aliases** for terms with multiple names (e.g., "TypeScript" with alias "TS")

5. **View results** in the "Results" tab - click any matched term to highlight it on the page

## Scoring

| Term Type    | Weight | Effect |
| ------------ | ------ | ------ |
| Want         | Low    | +1     |
| Want         | High   | +3     |
| Nice to have | Low    | +1     |
| Nice to have | High   | +2     |
| Don't want   | Low    | -10    |
| Don't want   | High   | -25    |

Base score starts at 100%. Missing terms don't penalize - only found "don't want" terms reduce your score.

## Development

```bash
# Start development server (hot reload)
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Production build
npm run build
```

## Tech Stack

- [Quasar Framework](https://quasar.dev/) - Vue 3 UI framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Pinia](https://pinia.vuejs.org/) - State management
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vitest](https://vitest.dev/) - Testing framework

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with [Quasar Framework](https://quasar.dev/) BEX (Browser Extension) mode.
