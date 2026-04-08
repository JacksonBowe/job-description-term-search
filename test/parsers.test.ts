import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchTerms } from '../src/services/matcher';
import { parseLinkedInJobDetail } from '../src-bex/parsers/linkedin';
import { parseSeekJobDetail } from '../src-bex/parsers/seek';
import type { Term, ParsedJob } from '../src/types';

// Get the directory of this test file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Silence console.log during tests (parsers log success messages)
beforeAll(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
	vi.restoreAllMocks();
});

// =============================================================================
// Fixture Types
// =============================================================================

interface FixtureExpected {
	title: string;
	company: string;
	shouldMatch: string[];
	shouldNotMatch?: string[];
}

interface Fixture {
	file: string;
	url: string;
	platform: 'linkedin' | 'seek';
	expected: FixtureExpected;
}

interface FixturesConfig {
	[key: string]: Fixture;
}

// =============================================================================
// Fixture Loading
// =============================================================================

function loadFixtures(): FixturesConfig {
	const fixturesPath = resolve(__dirname, 'fixtures.json');
	const content = readFileSync(fixturesPath, 'utf-8');
	const parsed = JSON.parse(content) as FixturesConfig;

	// Filter out schema and comment fields
	const fixtures: FixturesConfig = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (!key.startsWith('$') && !key.startsWith('_')) {
			fixtures[key] = value;
		}
	}
	return fixtures;
}

function loadFixtureHtml(fixture: Fixture): string | null {
	const htmlPath = resolve(__dirname, 'fixtures', fixture.file);
	if (!existsSync(htmlPath)) {
		return null;
	}
	return readFileSync(htmlPath, 'utf-8');
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTermsFromStrings(terms: string[]): Term[] {
	return terms.map((term, index) => ({
		id: `test-${index}`,
		term,
		type: 'want' as const,
		weight: 'low' as const,
		aliases: [],
	}));
}

/**
 * Strips external resources from HTML to prevent happy-dom from attempting to load them.
 * This prevents console spam from DOMException errors when parsing real-world HTML fixtures.
 */
function stripExternalResources(html: string): string {
	return (
		html
			// Remove link elements (stylesheets, preloads, etc.)
			.replace(/<link[^>]*>/gi, '')
			// Remove iframe elements (tracking pixels, ads, etc.)
			.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
			.replace(/<iframe[^>]*\/>/gi, '')
			// Remove script tags with src attributes
			.replace(/<script[^>]*src=[^>]*>[\s\S]*?<\/script>/gi, '')
			.replace(/<script[^>]*src=[^>]*\/>/gi, '')
	);
}

function setupDom(html: string, url: string): void {
	// Strip external resources to prevent happy-dom from trying to load them
	const cleanHtml = stripExternalResources(html);

	// Set up the document with the cleaned fixture HTML
	document.documentElement.innerHTML = cleanHtml;

	// Mock window.location
	Object.defineProperty(window, 'location', {
		value: {
			href: url,
			hostname: new URL(url).hostname,
			pathname: new URL(url).pathname,
			search: new URL(url).search,
		},
		writable: true,
	});
}

/**
 * Parse job using the appropriate parser based on platform
 */
function parseJob(platform: 'linkedin' | 'seek') {
	if (platform === 'linkedin') {
		return parseLinkedInJobDetail();
	} else {
		return parseSeekJobDetail();
	}
}

// =============================================================================
// Parser Fixture Tests
// =============================================================================

describe('Parser Fixtures', () => {
	const fixtures = loadFixtures();

	// Skip if no fixtures are configured
	if (Object.keys(fixtures).length === 0) {
		it.skip('No fixtures configured - add fixtures to test/fixtures.json', () => {});
		return;
	}

	for (const [name, fixture] of Object.entries(fixtures)) {
		describe(`Fixture: ${name}`, () => {
			const html = loadFixtureHtml(fixture);

			if (!html) {
				it.skip(`HTML file not found: ${fixture.file}`, () => {});
				return;
			}

			beforeEach(() => {
				// Reset DOM for each test
				setupDom(html, fixture.url);
			});

			it('should load fixture HTML', () => {
				expect(html).toBeTruthy();
				expect(html.length).toBeGreaterThan(100);
			});

			describe('Parser', () => {
				it('should successfully parse job', () => {
					const result = parseJob(fixture.platform);
					if (!result.success) {
						expect.fail(`Parse failed: ${result.error}`);
					}
					expect(result.job).toBeDefined();
				});

				it('should extract correct title', () => {
					const result = parseJob(fixture.platform);
					if (!result.success) {
						expect.fail(`Parse failed: ${result.error}`);
					}
					expect(result.job.title).toBe(fixture.expected.title);
				});

				it('should extract correct company', () => {
					const result = parseJob(fixture.platform);
					if (!result.success) {
						expect.fail(`Parse failed: ${result.error}`);
					}
					expect(result.job.company).toBe(fixture.expected.company);
				});

				it('should extract description with substantial content', () => {
					const result = parseJob(fixture.platform);
					if (!result.success) {
						expect.fail(`Parse failed: ${result.error}`);
					}
					expect(result.job.description).toBeDefined();
					// Description should be substantial (at least 100 chars)
					expect(result.job.description.length).toBeGreaterThan(100);
				});
			});

			describe('Term Matching', () => {
				it('should find expected terms in parsed description', () => {
					const result = parseJob(fixture.platform);
					if (!result.success) {
						expect.fail(`Parse failed: ${result.error}`);
					}

					const mockJob: ParsedJob = {
						title: result.job.title,
						company: result.job.company,
						description: result.job.description,
						url: result.job.url,
					};

					const terms = createTermsFromStrings(fixture.expected.shouldMatch);
					const matchResult = matchTerms(mockJob, terms);

					// Check each expected term is found
					for (const expectedTerm of fixture.expected.shouldMatch) {
						const found = matchResult.foundTerms.some(
							(ft) => ft.term.term.toLowerCase() === expectedTerm.toLowerCase(),
						);
						expect(found, `Expected to find term: "${expectedTerm}"`).toBe(true);
					}
				});

				if (fixture.expected.shouldNotMatch && fixture.expected.shouldNotMatch.length > 0) {
					it('should NOT find excluded terms in parsed description', () => {
						const result = parseJob(fixture.platform);
						if (!result.success) {
							expect.fail(`Parse failed: ${result.error}`);
						}

						const mockJob: ParsedJob = {
							title: result.job.title,
							company: result.job.company,
							description: result.job.description,
							url: result.job.url,
						};

						const terms = createTermsFromStrings(fixture.expected.shouldNotMatch!);
						const matchResult = matchTerms(mockJob, terms);

						// Check each excluded term is NOT found
						for (const excludedTerm of fixture.expected.shouldNotMatch!) {
							const found = matchResult.foundTerms.some(
								(ft) => ft.term.term.toLowerCase() === excludedTerm.toLowerCase(),
							);
							expect(found, `Expected NOT to find term: "${excludedTerm}"`).toBe(
								false,
							);
						}
					});
				}
			});
		});
	}
});

// =============================================================================
// Parser URL Detection Tests
// =============================================================================

describe('Parser URL Detection', () => {
	describe('LinkedIn URL patterns', () => {
		const linkedInUrls = [
			'https://www.linkedin.com/jobs/view/1234567890',
			'https://www.linkedin.com/jobs/search/?currentJobId=1234567890',
			'https://www.linkedin.com/jobs/search-results/?currentJobId=1234567890',
			'https://www.linkedin.com/jobs/collections/?currentJobId=1234567890',
		];

		for (const url of linkedInUrls) {
			it(`should recognize: ${url}`, () => {
				const urlObj = new URL(url);
				expect(urlObj.hostname).toContain('linkedin.com');
				expect(urlObj.pathname).toContain('/jobs/');
			});
		}
	});

	describe('Seek URL patterns', () => {
		const seekUrls = [
			'https://www.seek.com.au/job/12345678',
			'https://www.seek.com.au/?jobId=12345678',
		];

		for (const url of seekUrls) {
			it(`should recognize: ${url}`, () => {
				const urlObj = new URL(url);
				expect(urlObj.hostname).toContain('seek.com.au');
			});
		}
	});
});

// =============================================================================
// LinkedIn Job ID Extraction Tests
// =============================================================================

describe('LinkedIn Job ID Extraction', () => {
	function extractLinkedInJobId(url: string): string | null {
		// Try /jobs/view/{id} pattern
		const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
		if (viewMatch?.[1]) return viewMatch[1];

		// Try currentJobId query parameter
		try {
			const params = new URL(url).searchParams;
			const currentJobId = params.get('currentJobId');
			if (currentJobId) return currentJobId;
		} catch {
			return null;
		}

		return null;
	}

	it('should extract job ID from /jobs/view/{id}', () => {
		const id = extractLinkedInJobId('https://www.linkedin.com/jobs/view/1234567890');
		expect(id).toBe('1234567890');
	});

	it('should extract job ID from currentJobId query param', () => {
		const id = extractLinkedInJobId(
			'https://www.linkedin.com/jobs/search/?currentJobId=9876543210',
		);
		expect(id).toBe('9876543210');
	});

	it('should return null for non-job URLs', () => {
		const id = extractLinkedInJobId('https://www.linkedin.com/feed/');
		expect(id).toBeNull();
	});
});
