# HTML Test Fixtures

Place saved HTML files here for parser testing.

## How it works

Tests use the **actual parsers** (`parseLinkedInJobDetail`, `parseSeekJobDetail`) to:

1. Load full-page HTML from the fixture file
2. Determine which parser to use based on the URL
3. Call the parser to locate and extract the job description element
4. Verify the parser found the correct title and company
5. Term match against the **parsed description only** (not the entire page)

This ensures the parsers' selectors correctly isolate the target job from other content on the page (like job cards in search results).

## How to create a fixture

1. **Navigate to a job page** (LinkedIn or Seek)

2. **Save the full page HTML**:
   - Right-click → "Save As" → "Webpage, HTML Only"
   - Or use browser DevTools: Elements tab → right-click `<html>` → "Copy outer HTML" → paste into a file

3. **Name the file descriptively**:
   - Use format: `{platform}-{descriptor}.html`
   - Examples: `linkedin-senior-dev.html`, `seek-frontend-engineer.html`

4. **Add an entry to `fixtures.json`**:

   ```json
   {
     "linkedin-senior-dev": {
       "file": "html/linkedin-senior-dev.html",
       "url": "https://www.linkedin.com/jobs/view/1234567890",
       "platform": "linkedin",
       "expected": {
         "title": "Senior Software Developer",
         "company": "Tech Corp",
         "shouldMatch": ["TypeScript", "React", "Node.js"],
         "shouldNotMatch": ["Cobol", "Fortran"]
       }
     }
   }
   ```

5. **Run tests to verify**:
   ```bash
   npm run test
   ```

## Fixture JSON Schema

Each fixture entry requires:

| Field                     | Type                     | Description                               |
| ------------------------- | ------------------------ | ----------------------------------------- |
| `file`                    | string                   | Path to HTML file relative to `fixtures/` |
| `url`                     | string                   | Original URL the HTML was saved from      |
| `platform`                | `"linkedin"` \| `"seek"` | Which job site                            |
| `expected.title`          | string                   | Expected job title to extract             |
| `expected.company`        | string                   | Expected company name to extract          |
| `expected.shouldMatch`    | string[]                 | Terms that MUST be found in description   |
| `expected.shouldNotMatch` | string[]                 | Terms that must NOT be found              |

## What the tests verify

For each fixture, the tests check:

1. **Parser success** - The parser can find and extract the job
2. **Title extraction** - The extracted title matches `expected.title`
3. **Company extraction** - The extracted company matches `expected.company`
4. **Description content** - The description is substantial (100+ characters)
5. **Term matching** - All `shouldMatch` terms are found in the parsed description
6. **Term exclusion** - No `shouldNotMatch` terms are found in the parsed description

## Notes

- Save the **full page HTML** - tests verify parsers find the correct element
- The URL is used to mock `window.location.href` during tests
- `shouldMatch` terms are case-insensitive and use word-boundary matching
- Use `shouldNotMatch` to verify terms from OTHER jobs on the page aren't picked up
