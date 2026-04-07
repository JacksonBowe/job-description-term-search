<template>
	<q-page class="results-panel">
		<!-- Loading State -->
		<div v-if="isParsing" class="flex flex-center q-pa-xl">
			<q-spinner-dots size="40px" color="primary" />
		</div>

		<!-- No Parse Yet -->
		<div v-else-if="!parseResult" class="flex flex-center column q-pa-xl text-center">
			<q-icon name="search" size="48px" color="grey-5" class="q-mb-md" />
			<p class="text-body1 text-grey-7 q-mb-md">
				Click the refresh button to parse the current job
			</p>
			<q-btn color="primary" label="Parse Job" icon="refresh" @click="$emit('parse')" />
		</div>

		<!-- Error State -->
		<div v-else-if="parseResult.error" class="q-pa-md">
			<q-banner rounded class="bg-red-1 text-red-9">
				<template #avatar>
					<q-icon name="error" color="red" />
				</template>
				{{ parseResult.error }}
			</q-banner>
		</div>

		<!-- Results -->
		<div v-else-if="parseResult.job" class="q-pa-md">
			<!-- Job Info -->
			<q-card flat bordered class="q-mb-md">
				<q-card-section class="q-pb-sm">
					<div class="text-subtitle1 text-weight-medium">{{ parseResult.job.title }}</div>
					<div class="text-caption text-grey-7">{{ parseResult.job.company }}</div>
				</q-card-section>
			</q-card>

			<!-- Score Display -->
			<q-card
				v-if="parseResult.score !== null"
				flat
				bordered
				class="q-mb-md cursor-pointer"
				:class="scoreCardClass"
			>
				<q-card-section class="text-center q-py-md">
					<div class="text-h4 text-weight-bold">{{ parseResult.score }}%</div>
					<div class="text-caption">Match Score</div>
					<q-tooltip>
						<div class="text-body2">
							<div>Base: 100%</div>
							<div v-if="scoreBreakdown.wantBonus > 0" class="text-green">
								+ {{ scoreBreakdown.wantBonus }}% ({{ foundWantTerms.length }}
								matched)
							</div>
							<div v-if="scoreBreakdown.niceBonus > 0" class="text-blue">
								+ {{ scoreBreakdown.niceBonus }}% ({{ foundNiceToHaveTerms.length }}
								bonus)
							</div>
							<div v-if="scoreBreakdown.dontWantPenalty > 0" class="text-red">
								- {{ scoreBreakdown.dontWantPenalty }}% ({{
									foundDontWantTerms.length
								}}
								red flag{{ foundDontWantTerms.length > 1 ? 's' : '' }})
							</div>
							<div class="text-weight-bold q-mt-xs">= {{ parseResult.score }}%</div>
						</div>
					</q-tooltip>
				</q-card-section>
			</q-card>

			<!-- Summary Chips -->
			<div class="row q-gutter-sm q-mb-md">
				<q-chip
					v-if="foundWantTerms.length > 0"
					color="green"
					text-color="white"
					icon="check_circle"
					:label="`${foundWantTerms.length} Matched`"
				/>
				<q-chip
					v-if="foundNiceToHaveTerms.length > 0"
					color="blue"
					text-color="white"
					icon="star"
					:label="`${foundNiceToHaveTerms.length} Bonus`"
				/>
				<q-chip
					v-if="missingWantTerms.length > 0"
					color="grey"
					text-color="white"
					icon="help_outline"
					:label="`${missingWantTerms.length} Missing`"
				/>
				<q-chip
					v-if="foundDontWantTerms.length > 0"
					color="red"
					text-color="white"
					icon="warning"
					:label="`${foundDontWantTerms.length} Red Flag${foundDontWantTerms.length > 1 ? 's' : ''}`"
				/>
			</div>

			<!-- Red Flags (Don't Want - Found) - Show prominently at top -->
			<q-expansion-item
				v-if="foundDontWantTerms.length > 0"
				default-opened
				icon="warning"
				label="Red Flags"
				header-class="text-red-7 bg-red-1"
				class="q-mb-sm rounded-borders"
			>
				<q-list dense separator>
					<q-item
						v-for="match in foundDontWantTerms"
						:key="match.term.id"
						clickable
						@click="scrollToMatch(match)"
					>
						<q-item-section>
							<q-item-label>
								{{ match.term.term }}
								<q-badge
									v-if="match.term.weight === 'high'"
									color="orange"
									text-color="white"
									class="q-ml-xs"
								>
									High
								</q-badge>
								<q-tooltip
									v-if="match.context"
									class="bg-grey-9 text-body2"
									:offset="[0, 8]"
									max-width="300px"
								>
									"{{ match.context }}"
								</q-tooltip>
							</q-item-label>
							<q-item-label
								v-if="match.matchedOn !== match.term.term"
								caption
								class="text-grey-6"
							>
								matched as "{{ match.matchedOn }}"
							</q-item-label>
						</q-item-section>
						<q-item-section side>
							<q-icon name="flag" color="red" />
						</q-item-section>
					</q-item>
				</q-list>
			</q-expansion-item>

			<!-- Found Terms (Want) -->
			<q-expansion-item
				v-if="foundWantTerms.length > 0"
				default-opened
				icon="check_circle"
				label="Matched Skills"
				header-class="text-green-7"
				class="q-mb-sm"
			>
				<q-list dense separator>
					<q-item
						v-for="match in foundWantTerms"
						:key="match.term.id"
						clickable
						@click="scrollToMatch(match)"
					>
						<q-item-section>
							<q-item-label>
								{{ match.term.term }}
								<q-badge
									v-if="match.term.weight === 'high'"
									color="orange"
									text-color="white"
									class="q-ml-xs"
								>
									High
								</q-badge>
								<q-tooltip
									v-if="match.context"
									class="bg-grey-9 text-body2"
									:offset="[0, 8]"
									max-width="300px"
								>
									"{{ match.context }}"
								</q-tooltip>
							</q-item-label>
							<q-item-label
								v-if="match.matchedOn !== match.term.term"
								caption
								class="text-grey-6"
							>
								matched as "{{ match.matchedOn }}"
							</q-item-label>
						</q-item-section>
						<q-item-section side>
							<q-icon name="check" color="green" />
						</q-item-section>
					</q-item>
				</q-list>
			</q-expansion-item>

			<!-- Nice to Have Terms (Found) -->
			<q-expansion-item
				v-if="foundNiceToHaveTerms.length > 0"
				default-opened
				icon="star"
				label="Nice to Have"
				header-class="text-blue-7"
				class="q-mb-sm"
			>
				<q-list dense separator>
					<q-item
						v-for="match in foundNiceToHaveTerms"
						:key="match.term.id"
						clickable
						@click="scrollToMatch(match)"
					>
						<q-item-section>
							<q-item-label>
								{{ match.term.term }}
								<q-badge
									v-if="match.term.weight === 'high'"
									color="orange"
									text-color="white"
									class="q-ml-xs"
								>
									High
								</q-badge>
								<q-tooltip
									v-if="match.context"
									class="bg-grey-9 text-body2"
									:offset="[0, 8]"
									max-width="300px"
								>
									"{{ match.context }}"
								</q-tooltip>
							</q-item-label>
							<q-item-label
								v-if="match.matchedOn !== match.term.term"
								caption
								class="text-grey-6"
							>
								matched as "{{ match.matchedOn }}"
							</q-item-label>
						</q-item-section>
						<q-item-section side>
							<q-icon name="star" color="blue" />
						</q-item-section>
					</q-item>
				</q-list>
			</q-expansion-item>

			<!-- Missing Terms (Want) - Not required by job, informational only -->
			<q-expansion-item
				v-if="missingWantTerms.length > 0"
				icon="info_outline"
				label="Not Mentioned"
				caption="Skills you have that weren't listed"
				header-class="text-grey-7"
			>
				<q-list dense separator>
					<q-item v-for="term in missingWantTerms" :key="term.id">
						<q-item-section>
							<q-item-label>
								{{ term.term }}
								<q-badge
									v-if="term.weight === 'high'"
									color="orange"
									text-color="white"
									class="q-ml-xs"
								>
									High
								</q-badge>
							</q-item-label>
							<q-item-label v-if="term.aliases?.length" caption class="text-grey-6">
								aliases: {{ term.aliases.join(', ') }}
							</q-item-label>
						</q-item-section>
						<q-item-section side>
							<q-icon name="remove" color="grey" />
						</q-item-section>
					</q-item>
				</q-list>
			</q-expansion-item>

			<!-- No Terms Configured -->
			<div v-if="hasNoTerms" class="text-center q-pa-lg">
				<q-icon name="tune" size="32px" color="grey-5" class="q-mb-sm" />
				<p class="text-body2 text-grey-7">
					No terms configured. Go to the Terms tab to add terms to search for.
				</p>
			</div>
		</div>
	</q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ParseResult, MatchedTerm, ScrollToTermResponse } from 'src/types';

const props = defineProps<{
	parseResult: ParseResult | null;
	isParsing: boolean;
}>();

defineEmits<{
	parse: [];
}>();

// =============================================================================
// Scroll to Term
// =============================================================================

/**
 * Scroll to and highlight the matched term on the LinkedIn page
 */
async function scrollToMatch(match: MatchedTerm): Promise<void> {
	try {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		if (!tab?.id) {
			console.error('[Job Parser] No active tab found');
			return;
		}

		const response: ScrollToTermResponse = await chrome.tabs.sendMessage(tab.id, {
			type: 'SCROLL_TO_TERM',
			matchedOn: match.matchedOn,
		});

		if (!response.success) {
			console.warn('[Job Parser] Scroll failed:', response.error);
		}
	} catch (error) {
		console.error('[Job Parser] Failed to scroll to term:', error);
	}
}

// =============================================================================
// Computed Helpers
// =============================================================================

// Computed helpers to categorize terms
const foundWantTerms = computed(
	() => props.parseResult?.foundTerms.filter((m) => m.term.type === 'want') ?? [],
);

const foundNiceToHaveTerms = computed(
	() => props.parseResult?.foundTerms.filter((m) => m.term.type === 'nice-to-have') ?? [],
);

const foundDontWantTerms = computed(
	() => props.parseResult?.foundTerms.filter((m) => m.term.type === 'dont-want') ?? [],
);

const missingWantTerms = computed(
	() => props.parseResult?.missingTerms.filter((t) => t.type === 'want') ?? [],
);

// Don't show missing "nice-to-have" or "don't want" terms - they're not important

const hasNoTerms = computed(() => {
	if (!props.parseResult) return false;
	return props.parseResult.foundTerms.length === 0 && props.parseResult.missingTerms.length === 0;
});

// Score breakdown for tooltip - mirrors the logic in matcher.ts
const WANT_BONUS = { low: 1, high: 3 } as const;
const NICE_TO_HAVE_BONUS = { low: 1, high: 2 } as const;
const DONT_WANT_PENALTY = { low: 10, high: 25 } as const;

const scoreBreakdown = computed(() => {
	let wantBonus = 0;
	let niceBonus = 0;
	let dontWantPenalty = 0;

	for (const match of foundWantTerms.value) {
		wantBonus += WANT_BONUS[match.term.weight];
	}

	for (const match of foundNiceToHaveTerms.value) {
		niceBonus += NICE_TO_HAVE_BONUS[match.term.weight];
	}

	for (const match of foundDontWantTerms.value) {
		dontWantPenalty += DONT_WANT_PENALTY[match.term.weight];
	}

	return { wantBonus, niceBonus, dontWantPenalty };
});

const scoreCardClass = computed(() => {
	const score = props.parseResult?.score;
	if (score === null || score === undefined) return '';
	if (score >= 100) return 'bg-green-1 text-green-9';
	if (score >= 75) return 'bg-orange-1 text-orange-9';
	return 'bg-red-1 text-red-9';
});
</script>

<style lang="scss" scoped>
.results-panel {
	min-height: auto;
}
</style>
