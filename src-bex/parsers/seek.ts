/**
 * Seek job detail parser
 *
 * Parses the currently visible job description from the side drawer.
 *
 * Supported pages:
 * - seek.com.au (any page with job drawer open)
 *
 * Note: Seek jobs load in a side drawer without URL changes. Detection is
 * based on the presence of job content in the DOM rather than URL patterns.
 * Seek uses stable data-automation attributes which are more reliable than
 * class-based selectors.
 */

import type { ParseAttempt } from 'src/types';

// =============================================================================
// Selectors
// =============================================================================

/**
 * Seek DOM selectors for job detail drawer
 * Uses data-automation attributes which are stable
 */
const SELECTORS = {
	// Job description container
	description: ['[data-automation="jobAdDetails"]'],

	// Job title - contains an anchor with the job URL
	title: ['[data-automation="job-detail-title"]'],

	// Company/advertiser name
	company: ['[data-automation="advertiser-name"]'],

	// Additional metadata (optional)
	location: ['[data-automation="job-detail-location"]'],
	workType: ['[data-automation="job-detail-work-type"]'],
	classifications: ['[data-automation="job-detail-classifications"]'],
};

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse the currently visible job detail drawer
 * Returns a ParseAttempt with either the job data or a specific error message
 */
export function parseSeekJobDetail(): ParseAttempt {
	try {
		// Extract description first - this indicates the drawer is open
		const description = findDescription();
		if (!description) {
			console.log('[JDTS] No job description found in Seek drawer');
			return {
				success: false,
				error: 'No job selected. Click on a job to view its details.',
			};
		}

		// Extract title
		const title = findTitle();
		if (!title) {
			console.log('[JDTS] No job title found');
			return {
				success: false,
				error: "Couldn't find job title.",
			};
		}

		// Extract company
		const company = findCompany();

		// Extract job URL from the title link (more useful than current page URL)
		const url = findJobUrl();

		console.log('[JDTS] Successfully parsed Seek job:', { title, company });

		return {
			success: true,
			job: {
				title,
				company,
				description,
				url,
			},
		};
	} catch (error) {
		console.warn('[JDTS] Failed to parse Seek job:', error);
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
 * Find the job title from the drawer
 */
function findTitle(): string | null {
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
 * Find the company name from the drawer
 */
function findCompany(): string {
	for (const selector of SELECTORS.company) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 0 && text.length < 200) {
			return text;
		}
	}
	return 'Unknown Company';
}

/**
 * Find the job description from the drawer
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
 * Extract the job URL from the title link
 * Falls back to current page URL if link not found
 */
function findJobUrl(): string {
	// Try to get the direct job URL from the title link
	for (const selector of SELECTORS.title) {
		const container = document.querySelector<HTMLElement>(selector);
		const link = container?.querySelector<HTMLAnchorElement>('a[href*="/job/"]');
		if (link?.href) {
			// Return the full URL (link.href is already absolute)
			return link.href;
		}
	}

	// Fallback to current page URL
	return window.location.href;
}

/**
 * Check if we're on a Seek job page
 */
export function isSeekJobPage(): boolean {
	const hostname = window.location.hostname;
	return hostname.includes('seek.com.au');
}

/**
 * Check if job content is currently loaded in the DOM
 * Used to detect when Seek has opened the job drawer
 */
export function hasSeekJobContent(): boolean {
	for (const selector of SELECTORS.description) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text && text.length > 50) {
			return true;
		}
	}
	return false;
}
