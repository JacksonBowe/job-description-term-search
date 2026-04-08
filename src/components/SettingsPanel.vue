<template>
	<q-page class="settings-panel q-pa-md">
		<!-- Import/Export JSON -->
		<q-expansion-item
			class="q-mb-md"
			icon="swap_vert"
			label="Import / Export"
			caption="Save or load terms as JSON"
		>
			<q-card>
				<q-card-section>
					<!-- File-based -->
					<div class="text-caption text-grey-7 q-mb-xs">File</div>
					<div class="row q-gutter-sm q-mb-md">
						<q-btn
							outline
							color="primary"
							icon="download"
							label="Download"
							:disable="termsStore.terms.length === 0"
							@click="exportToFile"
						/>
						<q-btn
							outline
							color="primary"
							icon="upload"
							label="Upload"
							@click="triggerFileInput"
						/>
					</div>

					<!-- Clipboard-based -->
					<div class="text-caption text-grey-7 q-mb-xs">Clipboard</div>
					<div class="row q-gutter-sm q-mb-md">
						<q-btn
							outline
							color="secondary"
							icon="content_copy"
							label="Copy"
							:disable="termsStore.terms.length === 0"
							@click="copyToClipboard"
						/>
						<q-btn
							outline
							color="secondary"
							icon="content_paste"
							label="Paste"
							@click="pasteFromClipboard"
						/>
					</div>

					<!-- Paste JSON textarea (shown when user wants to paste manually) -->
					<q-input
						v-model="pasteJsonText"
						type="textarea"
						outlined
						dense
						placeholder="Or paste JSON here manually..."
						:rows="3"
						class="q-mb-sm"
					/>
					<q-btn
						dense
						color="primary"
						label="Import Pasted JSON"
						:disable="!pasteJsonText.trim()"
						@click="importPastedJson"
					/>

					<input
						ref="fileInputRef"
						type="file"
						accept=".json"
						style="display: none"
						@change="handleFileImport"
					/>
				</q-card-section>
			</q-card>
		</q-expansion-item>

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

				<!-- Type toggle (3 options) -->
				<div class="q-mt-md">
					<div class="text-caption text-grey-7 q-mb-xs">Type</div>
					<q-btn-toggle
						v-model="newTermType"
						spread
						no-caps
						dense
						toggle-color="primary"
						:options="termTypeOptions"
					/>
				</div>

				<!-- Weight toggle -->
				<div class="q-mt-sm">
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
			</q-card-section>
		</q-card>

		<!-- Terms List -->
		<div class="text-subtitle2 text-grey-8 q-mb-sm">
			Your Terms ({{ termsStore.termCount }})
			<div class="text-caption text-grey-6">
				<q-icon name="thumb_up" size="xs" color="green" />
				{{ termsStore.wantTerms.length }}
				<q-icon name="star" size="xs" color="blue" class="q-ml-sm" />
				{{ termsStore.niceToHaveTerms.length }}
				<q-icon name="thumb_down" size="xs" color="red" class="q-ml-sm" />
				{{ termsStore.dontWantTerms.length }}
			</div>
		</div>

		<!-- Search Filter -->
		<q-input
			v-model="searchFilter"
			dense
			outlined
			placeholder="Search terms..."
			class="q-mb-sm"
			clearable
		>
			<template #prepend>
				<q-icon name="search" />
			</template>
		</q-input>

		<!-- Grouped Terms -->
		<div v-if="termsStore.terms.length > 0" class="q-gutter-sm">
			<!-- Want Terms -->
			<q-expansion-item
				v-if="filteredWantTerms.length > 0"
				default-opened
				icon="thumb_up"
				:label="`Want (${filteredWantTerms.length})`"
				header-class="text-green-7 bg-green-1"
				class="rounded-borders"
			>
				<q-list dense separator bordered class="rounded-borders">
					<template v-for="term in filteredWantTerms" :key="term.id">
						<term-list-item
							:term="term"
							:is-editing="editingTermId === term.id"
							:edit-term="editTerm"
							:edit-aliases="editAliases"
							:edit-type="editType"
							:edit-weight="editWeight"
							@start-edit="startEdit"
							@save-edit="saveEdit"
							@cancel-edit="cancelEdit"
							@remove="removeTerm"
							@update:edit-term="editTerm = $event"
							@update:edit-aliases="editAliases = $event"
							@update:edit-type="editType = $event"
							@update:edit-weight="editWeight = $event"
							@cycle-type="cycleType"
							@toggle-weight="toggleWeight"
						/>
					</template>
				</q-list>
			</q-expansion-item>

			<!-- Nice to Have Terms -->
			<q-expansion-item
				v-if="filteredNiceToHaveTerms.length > 0"
				default-opened
				icon="star"
				:label="`Nice to Have (${filteredNiceToHaveTerms.length})`"
				header-class="text-blue-7 bg-blue-1"
				class="rounded-borders"
			>
				<q-list dense separator bordered class="rounded-borders">
					<template v-for="term in filteredNiceToHaveTerms" :key="term.id">
						<term-list-item
							:term="term"
							:is-editing="editingTermId === term.id"
							:edit-term="editTerm"
							:edit-aliases="editAliases"
							:edit-type="editType"
							:edit-weight="editWeight"
							@start-edit="startEdit"
							@save-edit="saveEdit"
							@cancel-edit="cancelEdit"
							@remove="removeTerm"
							@update:edit-term="editTerm = $event"
							@update:edit-aliases="editAliases = $event"
							@update:edit-type="editType = $event"
							@update:edit-weight="editWeight = $event"
							@cycle-type="cycleType"
							@toggle-weight="toggleWeight"
						/>
					</template>
				</q-list>
			</q-expansion-item>

			<!-- Don't Want Terms -->
			<q-expansion-item
				v-if="filteredDontWantTerms.length > 0"
				default-opened
				icon="thumb_down"
				:label="`Don't Want (${filteredDontWantTerms.length})`"
				header-class="text-red-7 bg-red-1"
				class="rounded-borders"
			>
				<q-list dense separator bordered class="rounded-borders">
					<template v-for="term in filteredDontWantTerms" :key="term.id">
						<term-list-item
							:term="term"
							:is-editing="editingTermId === term.id"
							:edit-term="editTerm"
							:edit-aliases="editAliases"
							:edit-type="editType"
							:edit-weight="editWeight"
							@start-edit="startEdit"
							@save-edit="saveEdit"
							@cancel-edit="cancelEdit"
							@remove="removeTerm"
							@update:edit-term="editTerm = $event"
							@update:edit-aliases="editAliases = $event"
							@update:edit-type="editType = $event"
							@update:edit-weight="editWeight = $event"
							@cycle-type="cycleType"
							@toggle-weight="toggleWeight"
						/>
					</template>
				</q-list>
			</q-expansion-item>
		</div>

		<!-- Empty State -->
		<q-card v-if="termsStore.terms.length === 0" flat bordered class="text-center q-pa-lg">
			<q-icon name="playlist_add" size="32px" color="grey-5" class="q-mb-sm" />
			<p class="text-body2 text-grey-7 q-mb-none">
				No terms yet. Add terms above to start matching job descriptions.
			</p>
		</q-card>

		<!-- No Search Results -->
		<q-card
			v-else-if="
				filteredWantTerms.length === 0 &&
				filteredNiceToHaveTerms.length === 0 &&
				filteredDontWantTerms.length === 0
			"
			flat
			bordered
			class="text-center q-pa-lg"
		>
			<q-icon name="search_off" size="32px" color="grey-5" class="q-mb-sm" />
			<p class="text-body2 text-grey-7 q-mb-none">No terms match "{{ searchFilter }}"</p>
		</q-card>

		<!-- Clear All Action -->
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
	</q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useTermsStore } from 'src/stores/termsStore';
import TermListItem from 'src/components/TermListItem.vue';
import type { Term, TermsExport, TermType, TermWeight } from 'src/types';

const $q = useQuasar();
const termsStore = useTermsStore();

// =============================================================================
// Term Type Options & Helpers
// =============================================================================

const termTypeOptions = [
	{ label: 'I want', value: 'want' as TermType },
	{ label: 'Nice to have', value: 'nice-to-have' as TermType },
	{ label: "I don't want", value: 'dont-want' as TermType },
];

// =============================================================================
// Add Term State
// =============================================================================

const newTerm = ref('');
const newAliases = ref('');
const newTermType = ref<TermType>('want');
const newTermWeight = ref<TermWeight>('low');

// =============================================================================
// Edit Term State
// =============================================================================

const editingTermId = ref<string | null>(null);
const editTerm = ref('');
const editAliases = ref('');
const editType = ref<TermType>('want');
const editWeight = ref<TermWeight>('low');

// =============================================================================
// Search Filter
// =============================================================================

const searchFilter = ref('');

const filteredWantTerms = computed(() => {
	const filter = searchFilter.value.toLowerCase().trim();
	const terms = termsStore.wantTerms;
	if (!filter) return terms;
	return terms.filter(
		(t) =>
			t.term.toLowerCase().includes(filter) ||
			t.aliases?.some((a) => a.toLowerCase().includes(filter)),
	);
});

const filteredNiceToHaveTerms = computed(() => {
	const filter = searchFilter.value.toLowerCase().trim();
	const terms = termsStore.niceToHaveTerms;
	if (!filter) return terms;
	return terms.filter(
		(t) =>
			t.term.toLowerCase().includes(filter) ||
			t.aliases?.some((a) => a.toLowerCase().includes(filter)),
	);
});

const filteredDontWantTerms = computed(() => {
	const filter = searchFilter.value.toLowerCase().trim();
	const terms = termsStore.dontWantTerms;
	if (!filter) return terms;
	return terms.filter(
		(t) =>
			t.term.toLowerCase().includes(filter) ||
			t.aliases?.some((a) => a.toLowerCase().includes(filter)),
	);
});

// =============================================================================
// Edit Term Functions
// =============================================================================

function startEdit(term: Term): void {
	editingTermId.value = term.id;
	editTerm.value = term.term;
	editAliases.value = term.aliases?.join(', ') ?? '';
	editType.value = term.type;
	editWeight.value = term.weight;
}

function cancelEdit(): void {
	editingTermId.value = null;
	editTerm.value = '';
	editAliases.value = '';
	editType.value = 'want';
	editWeight.value = 'low';
}

async function saveEdit(): Promise<void> {
	if (!editingTermId.value || !editTerm.value.trim()) return;

	const aliases = editAliases.value
		.split(',')
		.map((a) => a.trim())
		.filter((a) => a.length > 0);

	await termsStore.updateTerm(editingTermId.value, {
		term: editTerm.value.trim(),
		...(aliases.length > 0 ? { aliases } : {}),
		type: editType.value,
		weight: editWeight.value,
	});

	cancelEdit();
}

// =============================================================================
// Add Term Actions
// =============================================================================

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

// =============================================================================
// Quick Actions
// =============================================================================

const typeOrder: TermType[] = ['want', 'nice-to-have', 'dont-want'];

async function cycleType(id: string): Promise<void> {
	const term = termsStore.terms.find((t) => t.id === id);
	if (!term) return;

	const currentIndex = typeOrder.indexOf(term.type);
	const newType = typeOrder[(currentIndex + 1) % typeOrder.length]!;

	await termsStore.updateTerm(id, { type: newType });
}

async function toggleWeight(id: string): Promise<void> {
	const term = termsStore.terms.find((t) => t.id === id);
	if (!term) return;

	const newWeight: TermWeight = term.weight === 'low' ? 'high' : 'low';
	await termsStore.updateTerm(id, { weight: newWeight });
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

// =============================================================================
// JSON Import/Export
// =============================================================================

const fileInputRef = ref<HTMLInputElement | null>(null);
const pasteJsonText = ref('');

function exportToFile(): void {
	const data = termsStore.exportTermsToJson();
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = 'jdts-terms.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	URL.revokeObjectURL(url);

	$q.notify({
		type: 'positive',
		message: `Exported ${termsStore.terms.length} terms`,
	});
}

async function copyToClipboard(): Promise<void> {
	const data = termsStore.exportTermsToJson();
	const json = JSON.stringify(data, null, 2);

	try {
		await navigator.clipboard.writeText(json);
		$q.notify({
			type: 'positive',
			message: `Copied ${termsStore.terms.length} terms to clipboard`,
		});
	} catch {
		$q.notify({
			type: 'negative',
			message: 'Failed to copy to clipboard',
		});
	}
}

async function pasteFromClipboard(): Promise<void> {
	try {
		const text = await navigator.clipboard.readText();
		await importJsonText(text);
	} catch {
		$q.notify({
			type: 'negative',
			message: 'Failed to read clipboard. Try pasting manually below.',
		});
	}
}

async function importPastedJson(): Promise<void> {
	if (!pasteJsonText.value.trim()) return;
	await importJsonText(pasteJsonText.value);
	pasteJsonText.value = '';
}

async function importJsonText(text: string): Promise<void> {
	try {
		const data = JSON.parse(text) as TermsExport;

		// Basic validation
		if (!data.terms || !Array.isArray(data.terms)) {
			throw new Error('Invalid JSON format: missing terms array');
		}

		const result = await termsStore.importTermsFromJson(data);

		if (result.added > 0) {
			$q.notify({
				type: 'positive',
				message: `Imported ${result.added} term${result.added === 1 ? '' : 's'}${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}`,
			});
		} else {
			$q.notify({
				type: 'info',
				message: 'No new terms to import (all duplicates)',
			});
		}
	} catch (e) {
		$q.notify({
			type: 'negative',
			message: e instanceof Error ? e.message : 'Failed to parse JSON',
		});
	}
}

function triggerFileInput(): void {
	fileInputRef.value?.click();
}

async function handleFileImport(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	if (!file) return;

	try {
		const text = await file.text();
		await importJsonText(text);
	} catch (e) {
		$q.notify({
			type: 'negative',
			message: e instanceof Error ? e.message : 'Failed to read file',
		});
	}

	// Reset the input so the same file can be selected again
	input.value = '';
}
</script>

<style lang="scss" scoped>
.settings-panel {
	min-height: auto;
}

.edit-mode {
	background-color: rgba(0, 0, 0, 0.02);
	padding: 12px;
}
</style>
