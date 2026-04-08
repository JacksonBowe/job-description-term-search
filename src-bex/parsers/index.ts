/**
 * Site detection and parser routing for job detail pages
 */

import type { ParseAttempt } from 'src/types';
import {
	parseLinkedInJobDetail,
	isLinkedInJobPage,
	hasJobContent as hasLinkedInJobContent,
} from './linkedin';
import { parseSeekJobDetail, isSeekJobPage, hasSeekJobContent } from './seek';

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Check if we're on a supported job page
 */
export function isJobPage(): boolean {
	return isLinkedInJobPage() || isSeekJobPage();
}

/**
 * Check if job content is currently loaded in the DOM
 * Routes to the appropriate site-specific check
 */
export function hasJobContent(): boolean {
	if (isLinkedInJobPage()) {
		return hasLinkedInJobContent();
	}
	if (isSeekJobPage()) {
		return hasSeekJobContent();
	}
	return false;
}

/**
 * Parse the current job detail from the page
 * Returns a ParseAttempt with either the job data or a specific error message
 */
export function parseCurrentJob(): ParseAttempt {
	if (isLinkedInJobPage()) {
		return parseLinkedInJobDetail();
	}

	if (isSeekJobPage()) {
		return parseSeekJobDetail();
	}

	return {
		success: false,
		error: 'Not on a supported job site. Navigate to a LinkedIn or Seek job page.',
	};
}
