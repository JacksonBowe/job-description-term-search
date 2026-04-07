// =============================================================================
// Term Types
// =============================================================================

/**
 * How the user feels about this term in job descriptions
 * - 'want': Must-have, positive when found
 * - 'nice-to-have': Bonus points when found, no penalty when missing
 * - 'dont-want': Red flag, negative when found
 */
export type TermType = 'want' | 'nice-to-have' | 'dont-want';

/**
 * Importance/weight of the term for scoring
 */
export type TermWeight = 'low' | 'high';

/**
 * A term to search for in job descriptions
 */
export interface Term {
	id: string;
	term: string;
	aliases?: string[]; // Alternative terms (e.g., ["TS"] for "TypeScript")
	type: TermType; // Whether user wants or doesn't want this term
	weight: TermWeight; // Importance for scoring
}

/**
 * User's terms configuration
 */
export interface TermsConfig {
	terms: Term[];
}

/**
 * Export format for terms (JSON file)
 */
export interface TermsExport {
	version: 1;
	exportedAt: string;
	terms: Array<Omit<Term, 'id'>>;
}

// =============================================================================
// Job Types
// =============================================================================

/**
 * Basic job information parsed from the page
 */
export interface ParsedJob {
	title: string;
	company: string;
	description: string;
	url: string;
}

/**
 * A matched term with the specific match found
 */
export interface MatchedTerm {
	term: Term;
	matchedOn: string; // The actual string that matched (term or one of its aliases)
	context?: string; // The sentence/snippet containing the match
}

/**
 * Result of parsing and matching a job description
 */
export interface ParseResult {
	job: ParsedJob | null;
	foundTerms: MatchedTerm[];
	missingTerms: Term[];
	score: number | null; // Match score as percentage (0-100), null if no terms configured
	error?: string;
}

// =============================================================================
// Storage
// =============================================================================

/**
 * Keys used for chrome.storage.local
 */
export const STORAGE_KEYS = {
	TERMS: 'job-parser:terms',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default empty terms config
 */
export const DEFAULT_TERMS_CONFIG: TermsConfig = {
	terms: [],
};

// =============================================================================
// Messages (Content Script <-> Side Panel)
// =============================================================================

export interface ParseJobMessage {
	type: 'PARSE_JOB';
}

export interface ParseJobResponse {
	type: 'PARSE_JOB_RESPONSE';
	data: {
		job: ParsedJob | null;
		error?: string;
	};
}

export type ContentScriptMessage = ParseJobMessage;
export type ContentScriptResponse = ParseJobResponse;

// =============================================================================
// Parser Result Types
// =============================================================================

/**
 * Result from parsing a job page
 * Either succeeds with a job, or fails with a specific error message
 */
export type ParseAttempt = { success: true; job: ParsedJob } | { success: false; error: string };
