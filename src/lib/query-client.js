import { QueryClient } from '@tanstack/react-query';

export const SESSIONS_QUERY_KEY = ["sessions"];

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});