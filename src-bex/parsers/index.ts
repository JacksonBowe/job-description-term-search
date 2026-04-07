/**
 * Site detection and parser routing for job detail pages
 */

import type { ParseAttempt } from 'src/types';
import { parseLinkedInJobDetail, isLinkedInJobPage, hasJobContent } from './linkedin';

export { hasJobContent };

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Check if we're on a supported job page
 */
export function isJobPage(): boolean {
	return isLinkedInJobPage();
}

/**
 * Parse the current job detail from the page
 * Returns a ParseAttempt with either the job data or a specific error message
 */
export function parseCurrentJob(): ParseAttempt {
	if (isLinkedInJobPage()) {
		return parseLinkedInJobDetail();
	}

	return {
		success: false,
		error: 'Not on a supported job site. Navigate to a LinkedIn job page.',
	};
}
