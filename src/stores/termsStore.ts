/**
 * Terms store - manages the user's list of terms to search for
 *
 * Persists to chrome.storage.local via bridge events
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Term, TermsConfig, TermsExport, TermType, TermWeight } from 'src/types';
import { DEFAULT_TERMS_CONFIG } from 'src/types';
import { getTermsConfig, setTermsConfig } from 'src/services/storage';

export const useTermsStore = defineStore('terms', () => {
	// ==========================================================================
	// State
	// ==========================================================================

	const terms = ref<Term[]>([]);
	const isLoading = ref(false);
	const isLoaded = ref(false);
	const error = ref<string | null>(null);

	// ==========================================================================
	// Getters
	// ==========================================================================

	const termCount = computed(() => terms.value.length);

	const wantTerms = computed(() => terms.value.filter((t) => t.type === 'want'));

	const niceToHaveTerms = computed(() => terms.value.filter((t) => t.type === 'nice-to-have'));

	const dontWantTerms = computed(() => terms.value.filter((t) => t.type === 'dont-want'));

	const asConfig = computed(
		(): TermsConfig => ({
			terms: terms.value,
		}),
	);

	// ==========================================================================
	// Actions
	// ==========================================================================

	/**
	 * Load terms from storage
	 */
	async function load(): Promise<void> {
		if (isLoaded.value) return;

		isLoading.value = true;
		error.value = null;

		try {
			const config = await getTermsConfig();
			terms.value = config.terms;
			isLoaded.value = true;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to load terms';
			terms.value = DEFAULT_TERMS_CONFIG.terms;
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Save current terms to storage
	 */
	async function save(): Promise<void> {
		try {
			await setTermsConfig(asConfig.value);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to save terms';
			throw e;
		}
	}

	/**
	 * Add a new term
	 */
	async function addTerm(
		term: string,
		options?: {
			aliases?: string[];
			type?: TermType;
			weight?: TermWeight;
		},
	): Promise<void> {
		const trimmedTerm = term.trim();
		if (!trimmedTerm) return;

		const cleanAliases = options?.aliases?.map((a) => a.trim()).filter((a) => a.length > 0);
		const newTerm: Term = {
			id: crypto.randomUUID(),
			term: trimmedTerm,
			type: options?.type ?? 'want',
			weight: options?.weight ?? 'low',
			...(cleanAliases && cleanAliases.length > 0 ? { aliases: cleanAliases } : {}),
		};

		// Don't add duplicates
		const exists = terms.value.some((t) => t.term.toLowerCase() === newTerm.term.toLowerCase());
		if (exists) {
			error.value = `Term "${term}" already exists`;
			return;
		}

		terms.value.push(newTerm);
		await save();
	}

	/**
	 * Update an existing term
	 */
	async function updateTerm(
		id: string,
		updates: { term?: string; aliases?: string[]; type?: TermType; weight?: TermWeight },
	): Promise<void> {
		const index = terms.value.findIndex((t) => t.id === id);
		if (index === -1) {
			error.value = 'Term not found';
			return;
		}

		const current = terms.value[index]!;
		terms.value[index] = {
			id: current.id,
			term: updates.term ?? current.term,
			type: updates.type ?? current.type,
			weight: updates.weight ?? current.weight,
			...(updates.aliases
				? { aliases: updates.aliases }
				: current.aliases
					? { aliases: current.aliases }
					: {}),
		};
		await save();
	}

	/**
	 * Remove a term by ID
	 */
	async function removeTerm(id: string): Promise<void> {
		const index = terms.value.findIndex((t) => t.id === id);
		if (index === -1) return;

		terms.value.splice(index, 1);
		await save();
	}

	/**
	 * Clear all terms
	 */
	async function clearAll(): Promise<void> {
		terms.value = [];
		await save();
	}

	/**
	 * Import terms from an array of strings (defaults to 'want' type with 'low' weight)
	 */
	async function importTerms(
		termStrings: string[],
		options?: { type?: TermType; weight?: TermWeight },
	): Promise<number> {
		let added = 0;

		for (const termStr of termStrings) {
			const trimmed = termStr.trim();
			if (!trimmed) continue;

			const exists = terms.value.some((t) => t.term.toLowerCase() === trimmed.toLowerCase());
			if (exists) continue;

			terms.value.push({
				id: crypto.randomUUID(),
				term: trimmed,
				type: options?.type ?? 'want',
				weight: options?.weight ?? 'low',
			});
			added++;
		}

		if (added > 0) {
			await save();
		}

		return added;
	}

	/**
	 * Export terms to JSON format
	 */
	function exportTermsToJson(): TermsExport {
		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			terms: terms.value.map(({ term, aliases, type, weight }) => ({
				term,
				type,
				weight,
				...(aliases?.length ? { aliases } : {}),
			})),
		};
	}

	/**
	 * Import terms from JSON format (merges with existing, skips duplicates)
	 */
	async function importTermsFromJson(
		data: TermsExport,
	): Promise<{ added: number; skipped: number }> {
		let added = 0;
		let skipped = 0;

		for (const item of data.terms) {
			const trimmed = item.term.trim();
			if (!trimmed) continue;

			const exists = terms.value.some((t) => t.term.toLowerCase() === trimmed.toLowerCase());
			if (exists) {
				skipped++;
				continue;
			}

			const cleanAliases = item.aliases?.map((a) => a.trim()).filter((a) => a.length > 0);

			terms.value.push({
				id: crypto.randomUUID(),
				term: trimmed,
				type: item.type ?? 'want',
				weight: item.weight ?? 'low',
				...(cleanAliases && cleanAliases.length > 0 ? { aliases: cleanAliases } : {}),
			});
			added++;
		}

		if (added > 0) {
			await save();
		}

		return { added, skipped };
	}

	return {
		// State
		terms,
		isLoading,
		isLoaded,
		error,

		// Getters
		termCount,
		wantTerms,
		niceToHaveTerms,
		dontWantTerms,
		asConfig,

		// Actions
		load,
		save,
		addTerm,
		updateTerm,
		removeTerm,
		clearAll,
		importTerms,
		exportTermsToJson,
		importTermsFromJson,
	};
});
