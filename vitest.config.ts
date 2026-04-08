import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			src: resolve(projectRoot, 'src'),
			'src-bex': resolve(projectRoot, 'src-bex'),
		},
	},
	test: {
		environment: 'happy-dom',
		environmentOptions: {
			happyDOM: {
				settings: {
					disableJavaScriptFileLoading: true,
					disableCSSFileLoading: true,
					disableIframePageLoading: true,
					disableJavaScriptEvaluation: true,
					disableComputedStyleRendering: true,
					disableErrorCapturing: true,
				},
			},
		},
		include: ['test/**/*.{test,spec}.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/services/**', 'src-bex/parsers/**'],
			reporter: ['text', 'json', 'html'],
		},
		globals: true,
	},
});
