/**
 * Storage service - wraps chrome.storage.local access
 *
 * This module provides typed access to extension storage for use in the side panel.
 * Uses chrome.runtime.sendMessage to communicate with the background script.
 */

import type { TermsConfig } from 'src/types';
import { STORAGE_KEYS, DEFAULT_TERMS_CONFIG } from 'src/types';

/**
 * Get the terms configuration from storage
 * @returns The stored terms config, or default if not set
 */
export async function getTermsConfig(): Promise<TermsConfig> {
	try {
		const result = await chrome.runtime.sendMessage({
			type: 'storage.get',
			key: STORAGE_KEYS.TERMS,
		});
		return result ?? DEFAULT_TERMS_CONFIG;
	} catch (error) {
		console.error('[Storage] Failed to get terms config:', error);
		return DEFAULT_TERMS_CONFIG;
	}
}

/**
 * Save the terms configuration to storage
 */
export async function setTermsConfig(config: TermsConfig): Promise<void> {
	try {
		await chrome.runtime.sendMessage({
			type: 'storage.set',
			key: STORAGE_KEYS.TERMS,
			value: config,
		});
	} catch (error) {
		console.error('[Storage] Failed to set terms config:', error);
		throw error;
	}
}
