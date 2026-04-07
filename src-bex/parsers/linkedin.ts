/**
 * LinkedIn job detail parser
 *
 * Parses the currently visible job description from the detail panel.
 *
 * Supported pages:
 * - /jobs/search/?currentJobId=... - Job search with detail panel
 * - /jobs/search-results/?currentJobId=... - Search results with detail panel
 * - /jobs/collections/?currentJobId=... - Collections with detail panel
 * - /jobs/view/{id} - Individual job detail page
 *
 * Note: LinkedIn frequently changes their DOM structure and uses obfuscated
 * CSS class names. We use stable selectors where possible (data-testid, href patterns,
 * document.title) with fallbacks to class-based selectors.
 */

import type { ParseAttempt } from 'src/types';

// =============================================================================
// Selectors
// =============================================================================

/**
 * LinkedIn DOM selectors for job detail panel
 * Ordered by reliability - most stable selectors first
 */
const SELECTORS = {
	// Job description - data-testid is most stable
	description: [
		'[data-testid="expandable-text-box"]',
		// Fallback to old selectors in case of A/B testing
		'.jobs-description__content',
		'.jobs-box__html-content',
		'.jobs-description-content__text',
		'#job-details',
	],

	// Company name - href pattern is stable
	company: [
		'a[href*="/company/"]',
		// Fallback to old selectors
		'.job-details-jobs-unified-top-card__company-name',
		'.jobs-unified-top-card__company-name',
	],

	// Job title - fallback selectors (primary method uses document.title)
	title: [
		'.job-details-jobs-unified-top-card__job-title',
		'.jobs-unified-top-card__job-title',
		'h1',
	],
};

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse the currently visible job detail panel
 * Returns a ParseAttempt with either the job data or a specific error message
 */
export function parseLinkedInJobDetail(): ParseAttempt {
	// Check if we're on a job detail view
	const jobId = getJobIdFromUrl();
	if (!jobId) {
		console.log('[Job Parser] No job ID found in URL');
		return {
			success: false,
			error: 'No job selected. Click on a job to view its details.',
		};
	}

	try {
		// Extract description first - this is the most reliable indicator we're on a job page
		const description = findDescription();
		if (!description) {
			console.log('[Job Parser] No job description found');
			return {
				success: false,
				error: "Couldn't find job description. The job may still be loading, or LinkedIn may have updated their layout.",
			};
		}

		// Extract title - prefer document.title as it's most stable
		const title = extractTitleFromPage();
		if (!title) {
			console.log('[Job Parser] No job title found');
			return {
				success: false,
				error: "Couldn't find job title.",
			};
		}

		// Extract company
		const company = findCompany();

		console.log('[Job Parser] Successfully parsed job:', { title, company });

		return {
			success: true,
			job: {
				title,
				company,
				description,
				url: window.location.href,
			},
		};
	} catch (error) {
		console.warn('[Job Parser] Failed to parse LinkedIn job:', error);
		return {
			success: false,
			error: `Unexpected error while parsing: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract job title from the page
 * Primary: Parse from document.title (format: "Job Title | Company | LinkedIn")
 * Fallback: Query DOM elements
 */
function extractTitleFromPage(): string | null {
	// Primary method: Extract from document title
	// Format is typically: "Job Title | Company Name | LinkedIn"
	const pageTitle = document.title;
	if (pageTitle && pageTitle.includes('|')) {
		const parts = pageTitle.split('|');
		const title = parts[0]?.trim();
		if (title && title !== 'LinkedIn') {
			return title;
		}
	}

	// Fallback: Query DOM elements
	for (const selector of SELECTORS.title) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 0 && text.length < 200) {
			return text;
		}
	}

	return null;
}

/**
 * Find the company name from the page
 */
function findCompany(): string {
	for (const selector of SELECTORS.company) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 0 && text.length < 200) {
			// Clean up company name (remove follower counts like "Company383 followers")
			return text.replace(/\d+\s*followers?$/i, '').trim() || text;
		}
	}
	return 'Unknown Company';
}

/**
 * Find the job description from the page
 */
function findDescription(): string | null {
	for (const selector of SELECTORS.description) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 50) {
			// Description should be substantial
			return text;
		}
	}
	return null;
}

/**
 * Extract job ID from the current URL
 * Supports:
 * - /jobs/view/12345/
 * - /jobs/search/?currentJobId=12345
 * - /jobs/search-results/?currentJobId=12345
 * - /jobs/collections/?currentJobId=12345
 */
function getJobIdFromUrl(): string | null {
	const url = window.location.href;

	// Try /jobs/view/{id} pattern
	const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
	if (viewMatch?.[1]) return viewMatch[1];

	// Try currentJobId query parameter
	const params = new URLSearchParams(window.location.search);
	const currentJobId = params.get('currentJobId');
	if (currentJobId) return currentJobId;

	return null;
}

/**
 * Check if we're on a LinkedIn job page
 */
export function isLinkedInJobPage(): boolean {
	const url = window.location.href;
	return url.includes('linkedin.com/jobs/');
}

/**
 * Check if job content is currently loaded in the DOM
 * Used to detect when LinkedIn has finished loading job details
 */
export function hasJobContent(): boolean {
	for (const selector of SELECTORS.description) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 50) {
			return true;
		}
	}
	return false;
}
