import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		component: () => import('layouts/SidePanelLayout.vue'),
	},

	// Fallback for any unknown routes
	{
		path: '/:catchAll(.*)*',
		redirect: '/',
	},
];

export default routes;
