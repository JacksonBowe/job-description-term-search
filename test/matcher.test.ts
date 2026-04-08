import { describe, it, expect } from 'vitest';
import { matchTerms } from '../src/services/matcher';
import type { Term, ParsedJob } from '../src/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createTerm(
	term: string,
	type: Term['type'] = 'want',
	weight: Term['weight'] = 'low',
	aliases: string[] = [],
): Term {
	return {
		id: `test-${term}`,
		term,
		type,
		weight,
		aliases,
	};
}

function createJob(description: string, title = 'Software Engineer'): ParsedJob {
	return {
		title,
		company: 'Test Company',
		description,
		url: 'https://example.com/job/123',
	};
}

// =============================================================================
// Basic Matching Tests
// =============================================================================

describe('matchTerms', () => {
	describe('basic matching', () => {
		it('should find exact term matches', () => {
			const job = createJob('We need someone with TypeScript experience');
			const terms = [createTerm('TypeScript')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('TypeScript');
			expect(result.missingTerms).toHaveLength(0);
		});

		it('should be case-insensitive', () => {
			const job = createJob('We need TYPESCRIPT and javascript');
			const terms = [createTerm('typescript'), createTerm('JavaScript')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(2);
			expect(result.missingTerms).toHaveLength(0);
		});

		it('should track missing terms', () => {
			const job = createJob('We need Python experience');
			const terms = [createTerm('TypeScript'), createTerm('Python')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('Python');
			expect(result.missingTerms).toHaveLength(1);
			expect(result.missingTerms[0]?.term).toBe('TypeScript');
		});

		it('should return null job and all terms as missing when job is null', () => {
			const terms = [createTerm('TypeScript')];

			const result = matchTerms(null, terms);

			expect(result.job).toBeNull();
			expect(result.foundTerms).toHaveLength(0);
			expect(result.missingTerms).toEqual(terms);
			expect(result.score).toBeNull();
			expect(result.error).toBeDefined();
		});
	});

	// =============================================================================
	// Alias Matching Tests
	// =============================================================================

	describe('alias matching', () => {
		it('should match term aliases', () => {
			const job = createJob('Experience with TS is required');
			const terms = [createTerm('TypeScript', 'want', 'low', ['TS'])];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('TS');
		});

		it('should match primary term even if alias exists', () => {
			const job = createJob('TypeScript experience required');
			const terms = [createTerm('TypeScript', 'want', 'low', ['TS'])];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('TypeScript');
		});

		it('should handle multiple aliases', () => {
			const job = createJob('Looking for JS developers');
			const terms = [createTerm('JavaScript', 'want', 'low', ['JS', 'ECMAScript'])];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('JS');
		});
	});

	// =============================================================================
	// Word Boundary Tests
	// =============================================================================

	describe('word boundaries', () => {
		it('should not match partial words', () => {
			const job = createJob('We use TypeScripting techniques');
			const terms = [createTerm('TypeScript')];

			const result = matchTerms(job, terms);

			// "TypeScript" should NOT match "TypeScripting"
			expect(result.foundTerms).toHaveLength(0);
			expect(result.missingTerms).toHaveLength(1);
		});

		it('should match terms with special characters (C++)', () => {
			const job = createJob('Must know C++ and C#');
			const terms = [createTerm('C++'), createTerm('C#')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(2);
		});

		it('should match terms starting with special characters (.NET)', () => {
			const job = createJob('Experience with .NET Framework required');
			const terms = [createTerm('.NET')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(1);
			expect(result.foundTerms[0]?.matchedOn).toBe('.NET');
		});

		it('should not match C++ when only C is present', () => {
			const job = createJob('Knowledge of C programming');
			const terms = [createTerm('C++')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(0);
		});

		it('should match terms at sentence boundaries', () => {
			const job = createJob('Technologies: React, Vue, Angular. Python is also used.');
			const terms = [createTerm('React'), createTerm('Angular'), createTerm('Python')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(3);
		});
	});

	// =============================================================================
	// Scoring Tests
	// =============================================================================

	describe('scoring', () => {
		it('should return null score when no terms configured', () => {
			const job = createJob('Any job description');
			const result = matchTerms(job, []);

			expect(result.score).toBeNull();
		});

		it('should start at 100 and add bonuses for want terms', () => {
			const job = createJob('TypeScript and React experience');
			const terms = [
				createTerm('TypeScript', 'want', 'low'), // +1
				createTerm('React', 'want', 'high'), // +3
			];

			const result = matchTerms(job, terms);

			// 100 + 1 + 3 = 104
			expect(result.score).toBe(104);
		});

		it('should add smaller bonuses for nice-to-have terms', () => {
			const job = createJob('TypeScript and Docker experience');
			const terms = [
				createTerm('TypeScript', 'want', 'low'), // +1
				createTerm('Docker', 'nice-to-have', 'high'), // +2
			];

			const result = matchTerms(job, terms);

			// 100 + 1 + 2 = 103
			expect(result.score).toBe(103);
		});

		it('should subtract penalties for dont-want terms', () => {
			const job = createJob('5+ years experience required. TypeScript preferred.');
			const terms = [
				createTerm('TypeScript', 'want', 'low'), // +1
				createTerm('5+ years', 'dont-want', 'high'), // -25
			];

			const result = matchTerms(job, terms);

			// 100 + 1 - 25 = 76
			expect(result.score).toBe(76);
		});

		it('should clamp score at 0 minimum', () => {
			const job = createJob('On-call rotation, legacy COBOL, mandatory overtime');
			const terms = [
				createTerm('on-call', 'dont-want', 'high'), // -25
				createTerm('COBOL', 'dont-want', 'high'), // -25
				createTerm('legacy', 'dont-want', 'high'), // -25
				createTerm('overtime', 'dont-want', 'high'), // -25
				createTerm('mandatory', 'dont-want', 'high'), // -25
			];

			const result = matchTerms(job, terms);

			// 100 - 125 = -25, clamped to 0
			expect(result.score).toBe(0);
		});

		it('should allow score to exceed 100 with many matches', () => {
			const job = createJob(
				'TypeScript, React, Node.js, AWS, Docker, Kubernetes, GraphQL, PostgreSQL',
			);
			const terms = [
				createTerm('TypeScript', 'want', 'high'), // +3
				createTerm('React', 'want', 'high'), // +3
				createTerm('Node.js', 'want', 'high'), // +3
				createTerm('AWS', 'want', 'high'), // +3
				createTerm('Docker', 'nice-to-have', 'high'), // +2
				createTerm('Kubernetes', 'nice-to-have', 'high'), // +2
			];

			const result = matchTerms(job, terms);

			// 100 + 12 + 4 = 116
			expect(result.score).toBe(116);
		});

		it('should not penalize for missing want terms', () => {
			const job = createJob('TypeScript experience');
			const terms = [
				createTerm('TypeScript', 'want', 'low'), // +1
				createTerm('React', 'want', 'high'), // missing - no effect
				createTerm('Vue', 'want', 'high'), // missing - no effect
			];

			const result = matchTerms(job, terms);

			// 100 + 1 = 101 (missing terms don't subtract)
			expect(result.score).toBe(101);
		});
	});

	// =============================================================================
	// Context Extraction Tests
	// =============================================================================

	describe('context extraction', () => {
		it('should extract surrounding context for matched terms', () => {
			const job = createJob(
				'We are looking for a developer. TypeScript is essential for this role. Apply now.',
			);
			const terms = [createTerm('TypeScript')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms[0]?.context).toContain('TypeScript');
			expect(result.foundTerms[0]?.context).toContain('essential');
		});

		it('should search in both title and description', () => {
			const terms = [createTerm('Senior'), createTerm('TypeScript')];
			const job = createJob('TypeScript experience required', 'Senior Developer');

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(2);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('should handle empty description', () => {
			const job = createJob('');
			const terms = [createTerm('TypeScript')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(0);
			expect(result.missingTerms).toHaveLength(1);
		});

		it('should handle terms with spaces', () => {
			const job = createJob('Experience with Node.js and machine learning required');
			const terms = [createTerm('machine learning'), createTerm('Node.js')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(2);
		});

		it('should handle special regex characters in terms', () => {
			const job = createJob('Experience with C# and .NET Core (v3.1+)');
			const terms = [
				createTerm('C#'),
				createTerm('.NET Core'),
				createTerm('(v3.1+)'), // Contains regex special chars
			];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(3);
		});

		it('should handle hyphenated terms', () => {
			const job = createJob('Full-stack developer with front-end experience');
			const terms = [createTerm('Full-stack'), createTerm('front-end')];

			const result = matchTerms(job, terms);

			expect(result.foundTerms).toHaveLength(2);
		});
	});
});
