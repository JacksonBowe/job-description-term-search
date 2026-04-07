/**
 * Matcher service - finds terms in job descriptions
 *
 * This is a pure function module with no side effects.
 * It can be used in both the side panel and content scripts.
 */

import type { Term, MatchedTerm, ParsedJob, ParseResult } from 'src/types';

// =============================================================================
// Scoring constants
// =============================================================================

const WEIGHT_POINTS = {
	low: 1,
	high: 2,
} as const;

// =============================================================================
// Main matching function
// =============================================================================

/**
 * Match terms against a job description and calculate score
 */
export function matchTerms(job: ParsedJob | null, terms: Term[]): ParseResult {
	if (!job) {
		return {
			job: null,
			foundTerms: [],
			missingTerms: terms,
			score: null,
			error: 'No job found on this page',
		};
	}

	const text = normalizeText(`${job.title} ${job.description}`);
	const foundTerms: MatchedTerm[] = [];
	const missingTerms: Term[] = [];

	for (const term of terms) {
		const matchedOn = findMatch(text, term);
		if (matchedOn) {
			foundTerms.push({ term, matchedOn });
		} else {
			missingTerms.push(term);
		}
	}

	const score = calculateScore(foundTerms, missingTerms);

	return {
		job,
		foundTerms,
		missingTerms,
		score,
	};
}

// =============================================================================
// Scoring function
// =============================================================================

/**
 * Calculate match score as a percentage (0-100)
 *
 * Scoring logic:
 * - Found "want" terms: +1 (low) or +2 (high) points
 * - Missing "want" terms: 0 points (no penalty)
 * - Found "dont-want" terms: -1 (low) or -2 (high) points
 * - Missing "dont-want" terms: +0.5 (low) or +1 (high) points (reward for absence)
 *
 * Score = (actual points / max possible points) * 100, clamped to 0-100
 */
function calculateScore(foundTerms: MatchedTerm[], missingTerms: Term[]): number | null {
	const allTerms = [...foundTerms.map((f) => f.term), ...missingTerms];

	// No terms configured
	if (allTerms.length === 0) {
		return null;
	}

	let actualPoints = 0;
	let maxPoints = 0;

	// Process found terms
	for (const { term } of foundTerms) {
		const points = WEIGHT_POINTS[term.weight];

		if (term.type === 'want') {
			// Found a wanted term: add points
			actualPoints += points;
			maxPoints += points;
		} else {
			// Found a "don't want" term: subtract points
			actualPoints -= points;
			// Max points includes the reward for NOT having this term
			maxPoints += points * 0.5;
		}
	}

	// Process missing terms
	for (const term of missingTerms) {
		const points = WEIGHT_POINTS[term.weight];

		if (term.type === 'want') {
			// Missing a wanted term: no points, but counts toward max
			maxPoints += points;
		} else {
			// Missing a "don't want" term: reward!
			actualPoints += points * 0.5;
			maxPoints += points * 0.5;
		}
	}

	// Avoid division by zero
	if (maxPoints === 0) {
		return null;
	}

	// Calculate percentage, clamped to 0-100
	const percentage = (actualPoints / maxPoints) * 100;
	return Math.round(Math.max(0, Math.min(100, percentage)));
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Normalize text for matching (lowercase)
 */
function normalizeText(text: string): string {
	return text.toLowerCase();
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find which term or alias matches in the text
 * Returns the matched string, or null if no match
 */
function findMatch(text: string, term: Term): string | null {
	const termsToCheck = [term.term, ...(term.aliases ?? [])];

	for (const t of termsToCheck) {
		// Use word boundary matching to avoid partial matches
		// e.g., "Vue" shouldn't match "value"
		const pattern = new RegExp(`\\b${escapeRegex(t.toLowerCase())}\\b`, 'i');
		if (pattern.test(text)) {
			return t;
		}
	}

	return null;
}
