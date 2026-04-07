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

// Bonus points for found want/nice-to-have terms (added on top of 100%)
const WANT_BONUS = {
	low: 1,
	high: 3,
} as const;

const NICE_TO_HAVE_BONUS = {
	low: 1,
	high: 2,
} as const;

// Penalty for found dont-want terms (subtracted from score)
// Higher penalties since filtering negatives is the priority
const DONT_WANT_PENALTY = {
	low: 10,
	high: 25,
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
 * Calculate match score as a percentage
 *
 * Scoring logic (penalty-focused):
 * - Start at 100%
 * - Found "want" terms: +2% (low) or +5% (high) bonus
 * - Missing "want" terms: no effect (neutral)
 * - Found "nice-to-have" terms: +1% (low) or +2% (high) bonus
 * - Missing "nice-to-have" terms: no effect (neutral)
 * - Found "dont-want" terms: -10% (low) or -20% (high) penalty
 * - Missing "dont-want" terms: no effect (neutral)
 *
 * Score can exceed 100% with many matches, clamped to 0 minimum
 */
function calculateScore(foundTerms: MatchedTerm[], missingTerms: Term[]): number | null {
	const allTerms = [...foundTerms.map((f) => f.term), ...missingTerms];

	// No terms configured
	if (allTerms.length === 0) {
		return null;
	}

	// Start at 100%
	let score = 100;

	// Process found terms only (missing terms have no effect)
	for (const { term } of foundTerms) {
		if (term.type === 'want') {
			// Found a wanted term: bonus points
			score += WANT_BONUS[term.weight];
		} else if (term.type === 'nice-to-have') {
			// Found a nice-to-have term: smaller bonus
			score += NICE_TO_HAVE_BONUS[term.weight];
		} else {
			// Found a "don't want" term: penalty
			score -= DONT_WANT_PENALTY[term.weight];
		}
	}

	// Clamp to minimum 0 (no upper limit - good jobs can exceed 100%)
	return Math.max(0, Math.round(score));
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
 * Check if a character is a word character (letter, digit, underscore)
 */
function isWordChar(char: string | undefined): boolean {
	if (!char) return false;
	return /[a-zA-Z0-9_]/.test(char);
}

/**
 * Find which term or alias matches in the text
 * Returns the matched string, or null if no match
 */
function findMatch(text: string, term: Term): string | null {
	const termsToCheck = [term.term, ...(term.aliases ?? [])];

	for (const t of termsToCheck) {
		const escaped = escapeRegex(t.toLowerCase());

		// Word boundary at start (term shouldn't match mid-word like "JRuby" for "Ruby")
		const startBoundary = '\\b';

		// For trailing boundary: \b doesn't work if term ends with non-word char (C++, C#, .NET)
		// Use lookahead for whitespace, punctuation, or end of string instead
		const endBoundary = isWordChar(t[t.length - 1]) ? '\\b' : '(?=[\\s,;:!?)\\]}>]|$)';

		const pattern = new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'i');
		if (pattern.test(text)) {
			return t;
		}
	}

	return null;
}
