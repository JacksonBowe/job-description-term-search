<template>
	<q-page class="settings-panel q-pa-md">
		<!-- Add Term Form -->
		<q-card flat bordered class="q-mb-md">
			<q-card-section class="q-pb-sm">
				<div class="text-subtitle2 text-grey-8 q-mb-sm">Add Term</div>
				<q-form @submit.prevent="addTerm" class="row q-gutter-sm">
					<q-input
						v-model="newTerm"
						dense
						outlined
						placeholder="e.g., TypeScript"
						class="col"
						:error="!!termsStore.error"
						:error-message="termsStore.error ?? undefined"
						@update:model-value="termsStore.error = null"
					>
						<template #append>
							<q-btn
								type="submit"
								flat
								round
								dense
								icon="add"
								color="primary"
								:disable="!newTerm.trim()"
								@click="addTerm"
							/>
						</template>
					</q-input>
				</q-form>
				<q-input
					v-model="newAliases"
					dense
					outlined
					placeholder="Aliases (comma separated, optional)"
					class="q-mt-sm"
					hint="e.g., TS, typescript"
				/>

				<!-- Type and Weight toggles -->
				<div class="row q-mt-md q-gutter-md">
					<div class="col">
						<div class="text-caption text-grey-7 q-mb-xs">Type</div>
						<q-btn-toggle
							v-model="newTermType"
							spread
							no-caps
							dense
							toggle-color="primary"
							:options="[
								{ label: 'I want', value: 'want' },
								{ label: 'I don\'t want', value: 'dont-want' },
							]"
						/>
					</div>
					<div class="col">
						<div class="text-caption text-grey-7 q-mb-xs">Importance</div>
						<q-btn-toggle
							v-model="newTermWeight"
							spread
							no-caps
							dense
							toggle-color="primary"
							:options="[
								{ label: 'Low', value: 'low' },
								{ label: 'High', value: 'high' },
							]"
						/>
					</div>
				</div>
			</q-card-section>
		</q-card>

		<!-- Terms List -->
		<div class="text-subtitle2 text-grey-8 q-mb-sm">
			Your Terms ({{ termsStore.termCount }})
		</div>

		<q-list v-if="termsStore.terms.length > 0" bordered separator class="rounded-borders">
			<q-item v-for="term in termsStore.terms" :key="term.id">
				<q-item-section side>
					<q-icon
						:name="term.type === 'want' ? 'thumb_up' : 'thumb_down'"
						:color="term.type === 'want' ? 'green' : 'red'"
						size="xs"
					/>
				</q-item-section>
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
					<q-item-label v-if="term.aliases?.length" caption>
						{{ term.aliases.join(', ') }}
					</q-item-label>
				</q-item-section>
				<q-item-section side>
					<q-btn
						flat
						round
						dense
						icon="delete"
						color="red"
						size="sm"
						@click="removeTerm(term.id)"
					>
						<q-tooltip>Remove term</q-tooltip>
					</q-btn>
				</q-item-section>
			</q-item>
		</q-list>

		<!-- Empty State -->
		<q-card v-else flat bordered class="text-center q-pa-lg">
			<q-icon name="playlist_add" size="32px" color="grey-5" class="q-mb-sm" />
			<p class="text-body2 text-grey-7 q-mb-none">
				No terms yet. Add terms above to start matching job descriptions.
			</p>
		</q-card>

		<!-- Import/Clear Actions -->
		<div v-if="termsStore.terms.length > 0" class="q-mt-md row justify-end q-gutter-sm">
			<q-btn
				flat
				dense
				color="red"
				label="Clear All"
				icon="delete_sweep"
				@click="confirmClearAll"
			/>
		</div>

		<!-- Bulk Import -->
		<q-expansion-item
			class="q-mt-md"
			icon="upload"
			label="Bulk Import"
			caption="Paste a list of terms"
		>
			<q-card>
				<q-card-section>
					<q-input
						v-model="bulkImportText"
						type="textarea"
						outlined
						placeholder="Enter terms, one per line"
						:rows="4"
					/>
					<q-btn
						class="q-mt-sm"
						color="primary"
						label="Import"
						:disable="!bulkImportText.trim()"
						@click="bulkImport"
					/>
				</q-card-section>
			</q-card>
		</q-expansion-item>
	</q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useTermsStore } from 'src/stores/termsStore';
import type { TermType, TermWeight } from 'src/types';

const $q = useQuasar();
const termsStore = useTermsStore();

const newTerm = ref('');
const newAliases = ref('');
const newTermType = ref<TermType>('want');
const newTermWeight = ref<TermWeight>('low');
const bulkImportText = ref('');

async function addTerm(): Promise<void> {
	if (!newTerm.value.trim()) return;

	const aliases = newAliases.value
		.split(',')
		.map((a) => a.trim())
		.filter((a) => a.length > 0);

	await termsStore.addTerm(newTerm.value, {
		...(aliases.length > 0 ? { aliases } : {}),
		type: newTermType.value,
		weight: newTermWeight.value,
	});

	if (!termsStore.error) {
		newTerm.value = '';
		newAliases.value = '';
		// Keep the type and weight for next entry (user convenience)
	}
}

async function removeTerm(id: string): Promise<void> {
	await termsStore.removeTerm(id);
}

function confirmClearAll(): void {
	$q.dialog({
		title: 'Clear All Terms',
		message: 'Are you sure you want to remove all terms? This cannot be undone.',
		cancel: true,
		persistent: true,
	}).onOk(() => {
		void termsStore.clearAll();
	});
}

async function bulkImport(): Promise<void> {
	const lines = bulkImportText.value.split('\n');
	const count = await termsStore.importTerms(lines);

	if (count > 0) {
		$q.notify({
			type: 'positive',
			message: `Imported ${count} term${count === 1 ? '' : 's'}`,
		});
		bulkImportText.value = '';
	} else {
		$q.notify({
			type: 'info',
			message: 'No new terms to import',
		});
	}
}
</script>

<style lang="scss" scoped>
.settings-panel {
	min-height: auto;
}
</style>
