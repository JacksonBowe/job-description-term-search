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
import type { ParseJobResponse, ParseAttempt, ScrollToTermResponse } from 'src/types';

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

/** Duration to show highlight before fading (ms) */
const HIGHLIGHT_DURATION = 2000;

/** Selectors for job description containers */
const DESCRIPTION_SELECTORS = [
	'[data-testid="expandable-text-box"]',
	'.jobs-description__content',
	'.jobs-box__html-content',
	'.jobs-description-content__text',
	'#job-details',
];

/** Track the currently highlighted element for cleanup */
let currentHighlight: HTMLSpanElement | null = null;

/**
 * Represents a matched term's location in the DOM
 */
interface TermMatch {
	textNode: Text;
	startOffset: number;
	endOffset: number;
}

/**
 * Find the text node and exact position of the matched term
 * Uses TreeWalker to search text nodes in the job description
 */
function findTermTextNode(matchedOn: string): TermMatch | null {
	const searchTerm = matchedOn.toLowerCase();

	for (const selector of DESCRIPTION_SELECTORS) {
		const container = document.querySelector<HTMLElement>(selector);
		if (!container) continue;

		// Use TreeWalker to find text nodes containing the term
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node.textContent ?? '';
			const lowerText = text.toLowerCase();
			const index = lowerText.indexOf(searchTerm);

			if (index !== -1) {
				console.log('[Job Parser] Found term at offset', index, 'in text node');
				return {
					textNode: node as Text,
					startOffset: index,
					endOffset: index + matchedOn.length,
				};
			}
		}
	}

	console.log('[Job Parser] Term not found in DOM:', matchedOn);
	return null;
}

/**
 * Clear any existing highlight by unwrapping the span
 * Restores the original text node structure
 */
function clearHighlight(): void {
	if (currentHighlight) {
		const parent = currentHighlight.parentNode;
		if (parent) {
			// Get the text content from the highlight span
			const text = currentHighlight.textContent ?? '';
			const textNode = document.createTextNode(text);

			// Replace the span with the text node
			parent.replaceChild(textNode, currentHighlight);

			// Normalize to merge adjacent text nodes
			parent.normalize();
		}
		currentHighlight = null;
	}
}

/**
 * Highlight the matched term by wrapping it in a span
 * Uses the Range API to wrap only the exact matched text
 */
function highlightTermInNode(match: TermMatch): HTMLSpanElement {
	const range = document.createRange();
	range.setStart(match.textNode, match.startOffset);
	range.setEnd(match.textNode, match.endOffset);

	const span = document.createElement('span');
	span.className = 'jp-highlight';

	// Wrap the range contents in the span
	range.surroundContents(span);

	console.log('[Job Parser] Highlighted term:', span.textContent);
	return span;
}

/**
 * Expand the job description if it's collapsed
 * Clicks the "Show more" button if found
 * @returns true if expanded, false if already expanded or no button found
 */
async function expandJobDescription(): Promise<boolean> {
	// Find the expand button by its stable data-testid
	const button = document.querySelector<HTMLButtonElement>(
		'button[data-testid="expandable-text-button"]',
	);

	if (!button) {
		console.log('[Job Parser] No expand button found');
		return false;
	}

	// Check if it's a "more" button (not "less")
	const text = button.textContent?.toLowerCase() ?? '';
	if (!text.includes('more')) {
		console.log('[Job Parser] Description already expanded');
		return false; // Already expanded (shows "less")
	}

	console.log('[Job Parser] Expanding job description...');

	// The button has pointer-events: none, but inner span has pointer-events: auto
	// Find the clickable span inside
	const clickableSpan = button.querySelector<HTMLSpanElement>('span[style*="pointer-events"]');
	const targetElement = clickableSpan ?? button;

	targetElement.click();

	// Wait for expansion animation
	await new Promise((resolve) => setTimeout(resolve, 300));

	console.log('[Job Parser] Job description expanded');
	return true;
}

/**
 * Scroll to and highlight the matched term
 */
async function scrollToTerm(matchedOn: string): Promise<ScrollToTermResponse> {
	// Clear any existing highlight
	clearHighlight();

	// Expand description if collapsed
	await expandJobDescription();

	// Find the text node containing the term
	const match = findTermTextNode(matchedOn);
	if (!match) {
		return {
			success: false,
			error: 'Term not found on page. Try expanding the job description.',
		};
	}

	// Highlight the term using Range API (wraps in <span>)
	const highlightSpan = highlightTermInNode(match);
	currentHighlight = highlightSpan;

	// Scroll the highlighted span into view
	highlightSpan.scrollIntoView({
		behavior: 'smooth',
		block: 'center',
	});

	// Fade out highlight after duration
	setTimeout(() => {
		if (currentHighlight === highlightSpan) {
			highlightSpan.classList.add('jp-highlight--fade');
			// Remove highlight span after fade animation
			setTimeout(() => {
				if (currentHighlight === highlightSpan) {
					clearHighlight();
				}
			}, 500);
		}
	}, HIGHLIGHT_DURATION);

	console.log('[Job Parser] Scrolled to term:', matchedOn);
	return { success: true };
}

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
		message: { type: string; matchedOn?: string },
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: ParseJobResponse['data'] | ScrollToTermResponse) => void,
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

		if (message.type === 'SCROLL_TO_TERM') {
			console.log('[Job Parser] Scroll to term requested:', message.matchedOn);

			if (!message.matchedOn) {
				sendResponse({
					success: false,
					error: 'No term specified',
				});
				return true;
			}

			// Handle async scrollToTerm
			void scrollToTerm(message.matchedOn).then((result) => {
				sendResponse(result);
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
