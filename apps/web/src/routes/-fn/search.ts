import { useEffect, useState } from "react";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";

/**
 * Trail-edge debounce — `value` settles after `delayMs` of no further updates.
 * Used by the command palette so typing doesn't fire a request per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(id);
	}, [value, delayMs]);
	return debounced;
}

/**
 * Server function for the command palette's semantic search. Hits the same
 * `GET /api/v1/posts?q=` endpoint as the feed page, so cache entries are
 * shared (`["posts", 1, undefined, q]`) — typing the same query in the feed
 * URL and the palette both resolve to the same in-memory result.
 */
export const searchPostsFn = createServerFn({ method: "GET" })
	.inputValidator((input: { q: string }) => input)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.posts.$get({
				query: { q: data.q, page: "1" }
			});
			const { data: results } = await res.json();
			return results;
		})
	);

/**
 * Query options for the command palette. `enabled: q.length > 1` so empty or
 * single-character inputs don't fire requests — typing one letter at a time
 * shouldn't generate a request per keystroke.
 */
export const searchPostsQueryOptions = (q: string) =>
	queryOptions({
		queryKey: ["posts", 1, undefined, q],
		queryFn: () => searchPostsFn({ data: { q } }),
		enabled: q.trim().length > 1
	});
