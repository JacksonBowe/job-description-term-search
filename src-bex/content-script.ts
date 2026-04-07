/**
 * Content script for Job Parser extension
 *
 * This script runs on LinkedIn job pages.
 * It responds to parse requests from the side panel.
 *
 * Warning:
 *   Do not remove the import statement below. It is required for the extension to work.
 */
import { createBridge } from '#q-app/bex/content';
import { parseCurrentJob, isJobPage } from './parsers';
import type { ParseJobResponse, ParseAttempt } from 'src/types';

// =============================================================================
// Bridge Setup
// =============================================================================

// Initialize the bridge for communication with background
const bridge = createBridge({ debug: false });

// Extend BexEventMap with content script events
declare module '@quasar/app-vite' {
	interface BexEventMap {
		// Request to parse the current job
		'job.parse': [never, ParseAttempt];
	}
}

// =============================================================================
// Message Handlers
// =============================================================================

/**
 * Handle parse request via bridge
 */
bridge.on('job.parse', () => {
	console.log('[Job Parser] Parse requested via bridge');
	return parseCurrentJob();
});

/**
 * Handle messages from the side panel via chrome.runtime
 */
chrome.runtime.onMessage.addListener(
	(
		message: { type: string },
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: ParseJobResponse['data']) => void,
	) => {
		if (message.type === 'PARSE_JOB') {
			console.log('[Job Parser] Parse requested via runtime message');

			if (!isJobPage()) {
				sendResponse({
					job: null,
					error: 'Not on a LinkedIn job page. Navigate to linkedin.com/jobs/',
				});
				return true;
			}

			const result = parseCurrentJob();

			if (result.success) {
				sendResponse({ job: result.job });
			} else {
				sendResponse({
					job: null,
					error: result.error,
				});
			}
			return true; // Keep channel open for async response
		}

		return false;
	},
);

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the content script
 */
async function init(): Promise<void> {
	if (!isJobPage()) {
		console.log('[Job Parser] Not a job page, waiting for navigation...');
		return;
	}

	console.log('[Job Parser] Content script initialized on job page');

	// Connect to background
	try {
		await bridge.connectToBackground();
		console.log('[Job Parser] Connected to background');
	} catch (error) {
		console.error('[Job Parser] Failed to connect to background:', error);
	}
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => void init());
} else {
	void init();
}
