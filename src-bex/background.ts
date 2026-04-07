/**
 * Importing the file below initializes the extension background.
 *
 * Warnings:
 * 1. Do NOT remove the import statement below. It is required for the extension to work.
 *    If you don't need createBridge(), leave it as "import '#q-app/bex/background'".
 * 2. Do NOT import this file in multiple background scripts. Only in one!
 * 3. Import it in your background service worker (if available for your target browser).
 */
import { createBridge } from '#q-app/bex/background';
import { STORAGE_KEYS, DEFAULT_TERMS_CONFIG, type TermsConfig } from 'src/types';

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
	if (tab.id) {
		void chrome.sidePanel.open({ tabId: tab.id });
	}
});

// Set side panel behavior - open on action click
chrome.sidePanel
	.setPanelBehavior({ openPanelOnActionClick: true })
	.catch((error) => console.error('Failed to set panel behavior:', error));

// =============================================================================
// Chrome Runtime Message Handler (for side panel communication)
// =============================================================================

interface StorageGetMessage {
	type: 'storage.get';
	key: string;
}

interface StorageSetMessage {
	type: 'storage.set';
	key: string;
	value: unknown;
}

type RuntimeMessage = StorageGetMessage | StorageSetMessage;

chrome.runtime.onMessage.addListener(
	(
		message: RuntimeMessage,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: unknown) => void,
	) => {
		if (message.type === 'storage.get') {
			chrome.storage.local.get([message.key], (items) => {
				sendResponse(items[message.key] ?? null);
			});
			return true; // Keep channel open for async response
		}

		if (message.type === 'storage.set') {
			chrome.storage.local.set({ [message.key]: message.value }, () => {
				sendResponse({ success: true });
			});
			return true; // Keep channel open for async response
		}

		return false;
	},
);

// =============================================================================
// Quasar Bridge (for content script communication)
// =============================================================================

declare module '@quasar/app-vite' {
	interface BexEventMap {
		/* eslint-disable @typescript-eslint/no-explicit-any */
		log: [{ message: string; data?: any[] }, void];
		getTime: [never, number];

		'storage.get': [string | undefined, any];
		'storage.set': [{ key: string; value: any }, Promise<void>];
		'storage.remove': [string, Promise<void>];

		// Terms config for side panel
		'terms.get': [never, Promise<TermsConfig>];
		/* eslint-enable @typescript-eslint/no-explicit-any */
	}
}

/**
 * Call createBridge() to enable communication with the app & content scripts
 * (and between the app & content scripts), otherwise skip calling
 * createBridge() and use no bridge.
 */
const bridge = createBridge({ debug: false });

bridge.on('log', ({ from, payload }) => {
	console.log(`[BEX] @log from "${from}"`, payload);
});

bridge.on('getTime', () => {
	return Date.now();
});

bridge.on('storage.get', ({ payload: key }) => {
	return new Promise((resolve) => {
		if (key === void 0) {
			chrome.storage.local.get(null, (items) => {
				resolve(Object.values(items));
			});
		} else {
			chrome.storage.local.get([key], (items) => {
				resolve(items[key]);
			});
		}
	});
});

bridge.on('storage.set', ({ payload: { key, value } }) => {
	return chrome.storage.local.set({ [key]: value });
});

bridge.on('storage.remove', ({ payload: key }) => {
	return chrome.storage.local.remove(key);
});

/**
 * Get the terms config
 * Used by side panel to load user's terms
 */
bridge.on('terms.get', async () => {
	const items = await chrome.storage.local.get([STORAGE_KEYS.TERMS]);
	return (items[STORAGE_KEYS.TERMS] as TermsConfig) ?? DEFAULT_TERMS_CONFIG;
});
