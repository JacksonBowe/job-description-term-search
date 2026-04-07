<template>
	<!-- View Mode -->
	<q-item v-if="!isEditing" class="term-item">
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
			<div class="row q-gutter-xs">
				<q-btn
					flat
					round
					dense
					:icon="getTypeIcon(nextType)"
					:color="getTypeColor(nextType)"
					size="sm"
					@click.stop="$emit('cycleType', term.id)"
				>
					<q-tooltip>Change to {{ getTypeLabel(nextType) }}</q-tooltip>
				</q-btn>
				<q-btn
					flat
					round
					dense
					:icon="term.weight === 'low' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
					:color="term.weight === 'high' ? 'orange' : 'grey'"
					size="sm"
					@click.stop="$emit('toggleWeight', term.id)"
				>
					<q-tooltip>{{ term.weight === 'low' ? 'Set High' : 'Set Low' }}</q-tooltip>
				</q-btn>
				<q-btn
					flat
					round
					dense
					icon="edit"
					color="grey"
					size="sm"
					@click.stop="$emit('startEdit', term)"
				>
					<q-tooltip>Edit term</q-tooltip>
				</q-btn>
				<q-btn
					flat
					round
					dense
					icon="delete"
					color="red"
					size="sm"
					@click.stop="$emit('remove', term.id)"
				>
					<q-tooltip>Remove term</q-tooltip>
				</q-btn>
			</div>
		</q-item-section>
	</q-item>

	<!-- Edit Mode -->
	<q-item v-else class="edit-mode">
		<q-item-section>
			<div class="q-gutter-sm">
				<!-- Term input -->
				<q-input
					:model-value="editTerm"
					dense
					outlined
					label="Term"
					@update:model-value="(val) => $emit('update:editTerm', val as string)"
					@keyup.enter="$emit('saveEdit')"
					@keyup.escape="$emit('cancelEdit')"
				/>

				<!-- Aliases input -->
				<q-input
					:model-value="editAliases"
					dense
					outlined
					label="Aliases (comma separated)"
					@update:model-value="(val) => $emit('update:editAliases', val as string)"
				/>

				<!-- Type toggle -->
				<div>
					<div class="text-caption text-grey-7 q-mb-xs">Type</div>
					<q-btn-toggle
						:model-value="editType"
						spread
						no-caps
						dense
						toggle-color="primary"
						:options="termTypeOptions"
						@update:model-value="(val) => $emit('update:editType', val as TermType)"
					/>
				</div>

				<!-- Weight toggle -->
				<div>
					<div class="text-caption text-grey-7 q-mb-xs">Importance</div>
					<q-btn-toggle
						:model-value="editWeight"
						spread
						no-caps
						dense
						toggle-color="primary"
						:options="[
							{ label: 'Low', value: 'low' },
							{ label: 'High', value: 'high' },
						]"
						@update:model-value="(val) => $emit('update:editWeight', val as TermWeight)"
					/>
				</div>

				<!-- Save/Cancel buttons -->
				<div class="row q-gutter-sm justify-end q-mt-sm">
					<q-btn flat dense label="Cancel" color="grey" @click="$emit('cancelEdit')" />
					<q-btn
						unelevated
						dense
						label="Save"
						color="primary"
						:disable="!editTerm.trim()"
						@click="$emit('saveEdit')"
					/>
				</div>
			</div>
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Term, TermType, TermWeight } from 'src/types';

const props = defineProps<{
	term: Term;
	isEditing: boolean;
	editTerm: string;
	editAliases: string;
	editType: TermType;
	editWeight: TermWeight;
}>();

defineEmits<{
	startEdit: [term: Term];
	saveEdit: [];
	cancelEdit: [];
	remove: [id: string];
	'update:editTerm': [value: string];
	'update:editAliases': [value: string];
	'update:editType': [value: TermType];
	'update:editWeight': [value: TermWeight];
	cycleType: [id: string];
	toggleWeight: [id: string];
}>();

const termTypeOptions = [
	{ label: 'Want', value: 'want' as TermType },
	{ label: 'Nice', value: 'nice-to-have' as TermType },
	{ label: "Don't", value: 'dont-want' as TermType },
];

const typeOrder: TermType[] = ['want', 'nice-to-have', 'dont-want'];

const nextType = computed(() => {
	const currentIndex = typeOrder.indexOf(props.term.type);
	return typeOrder[(currentIndex + 1) % typeOrder.length]!;
});

function getTypeIcon(type: TermType): string {
	switch (type) {
		case 'want':
			return 'thumb_up';
		case 'nice-to-have':
			return 'star';
		case 'dont-want':
			return 'thumb_down';
	}
}

function getTypeColor(type: TermType): string {
	switch (type) {
		case 'want':
			return 'green';
		case 'nice-to-have':
			return 'blue';
		case 'dont-want':
			return 'red';
	}
}

function getTypeLabel(type: TermType): string {
	switch (type) {
		case 'want':
			return 'Want';
		case 'nice-to-have':
			return 'Nice to Have';
		case 'dont-want':
			return "Don't Want";
	}
}
</script>

<style lang="scss" scoped>
.term-item {
	padding: 4px 8px;
}

.edit-mode {
	background-color: rgba(0, 0, 0, 0.02);
	padding: 12px;
}
</style>
