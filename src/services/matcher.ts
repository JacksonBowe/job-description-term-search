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

	const originalText = `${job.title} ${job.description}`;
	const text = normalizeText(originalText);
	const foundTerms: MatchedTerm[] = [];
	const missingTerms: Term[] = [];

	for (const term of terms) {
		const match = findMatch(text, originalText, term);
		if (match) {
			foundTerms.push({ term, matchedOn: match.matchedOn, context: match.context });
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

/** Maximum length for context snippet */
const MAX_CONTEXT_LENGTH = 150;

/**
 * Result from finding a match
 */
interface MatchResult {
	matchedOn: string;
	context: string;
}

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
 * Extract a sentence or snippet around a match position
 * Looks for sentence boundaries (. ! ?) or falls back to character limits
 */
function extractContext(text: string, matchStart: number, matchEnd: number): string {
	// Sentence boundary pattern
	const sentenceEnd = /[.!?]/;

	// Find start of sentence (look backwards for sentence boundary)
	let contextStart = matchStart;
	for (let i = matchStart - 1; i >= 0 && matchStart - i < MAX_CONTEXT_LENGTH; i--) {
		if (sentenceEnd.test(text[i]!)) {
			contextStart = i + 1;
			break;
		}
		contextStart = i;
	}

	// Find end of sentence (look forwards for sentence boundary)
	let contextEnd = matchEnd;
	for (let i = matchEnd; i < text.length && i - matchEnd < MAX_CONTEXT_LENGTH; i++) {
		contextEnd = i + 1;
		if (sentenceEnd.test(text[i]!)) {
			break;
		}
	}

	// Extract and clean up the context
	let context = text.slice(contextStart, contextEnd).trim();

	// If context is too long, truncate intelligently
	if (context.length > MAX_CONTEXT_LENGTH) {
		// Center the match in the context
		const matchPosInContext = matchStart - contextStart;
		const halfLength = Math.floor(MAX_CONTEXT_LENGTH / 2);

		let truncStart = Math.max(0, matchPosInContext - halfLength);
		let truncEnd = Math.min(context.length, matchPosInContext + halfLength);

		// Adjust to not cut words
		while (truncStart > 0 && context[truncStart - 1] !== ' ') {
			truncStart--;
		}
		while (truncEnd < context.length && context[truncEnd] !== ' ') {
			truncEnd++;
		}

		context = context.slice(truncStart, truncEnd).trim();
	}

	return context;
}

/**
 * Find which term or alias matches in the text
 * Returns the matched string and surrounding context, or null if no match
 */
function findMatch(text: string, originalText: string, term: Term): MatchResult | null {
	const termsToCheck = [term.term, ...(term.aliases ?? [])];

	for (const t of termsToCheck) {
		const escaped = escapeRegex(t.toLowerCase());

		// Word boundary at start (term shouldn't match mid-word like "JRuby" for "Ruby")
		const startBoundary = '\\b';

		// For trailing boundary: \b doesn't work if term ends with non-word char (C++, C#, .NET)
		// Use lookahead for whitespace, punctuation, or end of string instead
		const endBoundary = isWordChar(t[t.length - 1]) ? '\\b' : '(?=[\\s,;:!?)\\]}>]|$)';

		const pattern = new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'gi');
		const match = pattern.exec(text);

		if (match) {
			// Extract context from the original (non-normalized) text
			const context = extractContext(
				originalText,
				match.index,
				match.index + match[0].length,
			);
			return { matchedOn: t, context };
		}
	}

	return null;
}
