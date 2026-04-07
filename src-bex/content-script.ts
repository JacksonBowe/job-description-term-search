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
import { parseCurrentJob, isJobPage, hasJobContent } from './parsers';
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

/** Default timeout for waiting for job content to load (ms) */
const CONTENT_LOAD_TIMEOUT = 5000;

/**
 * Wait for job content to load on the page
 * Uses MutationObserver to detect when job description appears
 * @param timeout - Maximum time to wait in ms
 * @returns true if content loaded, false if timeout reached
 */
async function waitForJobContent(timeout = CONTENT_LOAD_TIMEOUT): Promise<boolean> {
	// Check if content already exists
	if (hasJobContent()) {
		console.log('[Job Parser] Job content already loaded');
		return true;
	}

	console.log('[Job Parser] Waiting for job content to load...');

	return new Promise((resolve) => {
		let resolved = false;

		// Set up MutationObserver to watch for content appearing
		const observer = new MutationObserver(() => {
			if (!resolved && hasJobContent()) {
				resolved = true;
				observer.disconnect();
				console.log('[Job Parser] Job content loaded');
				resolve(true);
			}
		});

		// Watch the document body for changes
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		// Timeout handler
		setTimeout(() => {
			if (!resolved) {
				resolved = true;
				observer.disconnect();
				const found = hasJobContent(); // Final check
				console.log(`[Job Parser] Wait timeout reached, content found: ${found}`);
				resolve(found);
			}
		}, timeout);
	});
}

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

			// Wait for content to load, then parse
			void waitForJobContent().then((contentLoaded) => {
				if (!contentLoaded) {
					sendResponse({
						job: null,
						error: 'Job content failed to load. Try refreshing the page.',
					});
					return;
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
			});

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
