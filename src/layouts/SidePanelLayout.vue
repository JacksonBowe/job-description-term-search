<template>
	<q-layout view="hHh lpr fFf">
		<q-header elevated class="bg-primary">
			<q-toolbar class="panel-header">
				<q-toolbar-title class="text-subtitle1">Job Parser</q-toolbar-title>
				<q-btn flat round dense icon="refresh" @click="parseJob" :loading="isParsing">
					<q-tooltip>Parse current job</q-tooltip>
				</q-btn>
			</q-toolbar>
			<q-tabs v-model="currentTab" dense class="text-white bg-primary" active-color="white">
				<q-tab name="results" label="Results" icon="analytics" />
				<q-tab name="settings" label="Terms" icon="tune" />
			</q-tabs>
		</q-header>

		<q-page-container>
			<q-tab-panels v-model="currentTab" animated class="bg-transparent">
				<q-tab-panel name="results" class="q-pa-none">
					<ResultsPanel
						:parse-result="parseResult"
						:is-parsing="isParsing"
						@parse="parseJob"
					/>
				</q-tab-panel>
				<q-tab-panel name="settings" class="q-pa-none">
					<SettingsPanel />
				</q-tab-panel>
			</q-tab-panels>
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { ParseResult, ParsedJob } from 'src/types';
import { matchTerms } from 'src/services/matcher';
import { useTermsStore } from 'src/stores/termsStore';
import ResultsPanel from 'src/components/ResultsPanel.vue';
import SettingsPanel from 'src/components/SettingsPanel.vue';

const termsStore = useTermsStore();

const currentTab = ref('results');
const isParsing = ref(false);
const parseResult = ref<ParseResult | null>(null);

// Track the last parsed job ID to avoid duplicate parses
let lastJobId: string | null = null;

// =============================================================================
// Job ID Extraction
// =============================================================================

/**
 * Extract job ID from a LinkedIn URL
 * Supports:
 * - /jobs/view/12345/
 * - /jobs/search/?currentJobId=12345
 * - /jobs/search-results/?currentJobId=12345
 * - /jobs/collections/?currentJobId=12345
 */
function getJobIdFromUrl(url: string): string | null {
	// Try /jobs/view/{id} pattern
	const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
	if (viewMatch?.[1]) return viewMatch[1];

	// Try currentJobId query parameter
	try {
		const params = new URL(url).searchParams;
		return params.get('currentJobId');
	} catch {
		return null;
	}
}

// =============================================================================
// Tab Update Listener
// =============================================================================

/**
 * Handle tab URL updates - auto-parse when job changes
 */
function handleTabUpdate(tabId: number, changeInfo: { url?: string }, tab: chrome.tabs.Tab): void {
	// Only react to URL changes on the active tab
	if (!changeInfo.url || !tab.active) return;

	// Only react to LinkedIn job pages
	if (!changeInfo.url.includes('linkedin.com/jobs')) return;

	// Extract job ID from the new URL
	const jobId = getJobIdFromUrl(changeInfo.url);

	// Only re-parse if the job ID changed
	if (jobId && jobId !== lastJobId) {
		console.log('[Job Parser] Job changed, auto-parsing:', jobId);
		lastJobId = jobId;
		parseJob().catch((err) => console.error('[Job Parser] Auto-parse failed:', err));
	}
}

// =============================================================================
// Parse Job
// =============================================================================

/**
 * Request the content script to parse the current job
 */
async function parseJob(): Promise<void> {
	isParsing.value = true;
	parseResult.value = null;

	try {
		// Get the current active tab
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		if (!tab?.id) {
			parseResult.value = {
				job: null,
				foundTerms: [],
				missingTerms: termsStore.terms,
				score: null,
				error: 'No active tab found',
			};
			return;
		}

		// Check if we're on a LinkedIn page
		if (!tab.url?.includes('linkedin.com/jobs')) {
			parseResult.value = {
				job: null,
				foundTerms: [],
				missingTerms: termsStore.terms,
				score: null,
				error: 'Navigate to a LinkedIn job page to parse',
			};
			return;
		}

		// Update lastJobId from current URL
		const jobId = getJobIdFromUrl(tab.url);
		if (jobId) {
			lastJobId = jobId;
		}

		// Send message to content script
		const response: {
			job: ParsedJob | null;
			error?: string;
		} = await chrome.tabs.sendMessage(tab.id, { type: 'PARSE_JOB' });

		if (response.error || !response.job) {
			parseResult.value = {
				job: null,
				foundTerms: [],
				missingTerms: termsStore.terms,
				score: null,
				error: response.error ?? 'Failed to parse job',
			};
			return;
		}

		// Match terms against the job description
		parseResult.value = matchTerms(response.job, termsStore.terms);
	} catch (error) {
		console.error('[Job Parser] Parse error:', error);
		parseResult.value = {
			job: null,
			foundTerms: [],
			missingTerms: termsStore.terms,
			score: null,
			error: 'Could not connect to page. Try refreshing the LinkedIn page.',
		};
	} finally {
		isParsing.value = false;
	}
}

// =============================================================================
// Lifecycle
// =============================================================================

onMounted(async () => {
	// Load terms from storage
	await termsStore.load();

	// Auto-parse on mount if we have terms
	if (termsStore.terms.length > 0) {
		await parseJob();
	}

	// Listen for tab URL changes to auto-parse when job changes
	chrome.tabs.onUpdated.addListener(handleTabUpdate);
});

onUnmounted(() => {
	// Clean up the tab listener
	chrome.tabs.onUpdated.removeListener(handleTabUpdate);
});
</script>

<style lang="scss" scoped>
.panel-header {
	min-height: 48px;
	padding: 0 8px 0 16px;
}
</style>
