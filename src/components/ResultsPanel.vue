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
				class="q-mb-md"
				:class="scoreCardClass"
			>
				<q-card-section class="text-center q-py-md">
					<div class="text-h4 text-weight-bold">{{ parseResult.score }}%</div>
					<div class="text-caption">Match Score</div>
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
					<q-item v-for="match in foundDontWantTerms" :key="match.term.id">
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
					<q-item v-for="match in foundWantTerms" :key="match.term.id">
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

			<!-- Missing Terms (Want) -->
			<q-expansion-item
				v-if="missingWantTerms.length > 0"
				icon="help_outline"
				label="Missing Skills"
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
import type { ParseResult } from 'src/types';

const props = defineProps<{
	parseResult: ParseResult | null;
	isParsing: boolean;
}>();

defineEmits<{
	parse: [];
}>();

// Computed helpers to categorize terms
const foundWantTerms = computed(
	() => props.parseResult?.foundTerms.filter((m) => m.term.type === 'want') ?? [],
);

const foundDontWantTerms = computed(
	() => props.parseResult?.foundTerms.filter((m) => m.term.type === 'dont-want') ?? [],
);

const missingWantTerms = computed(
	() => props.parseResult?.missingTerms.filter((t) => t.type === 'want') ?? [],
);

// Don't show missing "don't want" terms - they're not important

const hasNoTerms = computed(() => {
	if (!props.parseResult) return false;
	return props.parseResult.foundTerms.length === 0 && props.parseResult.missingTerms.length === 0;
});

const scoreCardClass = computed(() => {
	const score = props.parseResult?.score;
	if (score === null || score === undefined) return '';
	if (score >= 70) return 'bg-green-1 text-green-9';
	if (score >= 40) return 'bg-orange-1 text-orange-9';
	return 'bg-red-1 text-red-9';
});
</script>

<style lang="scss" scoped>
.results-panel {
	min-height: auto;
}
</style>
