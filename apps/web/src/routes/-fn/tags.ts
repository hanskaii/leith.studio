import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";

export const getTagsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.tags.$get();
		const { data: results } = await res.json();
		return results;
	})
);

export const tagsQueryOptions = () =>
	queryOptions({
		queryKey: ["tags"],
		queryFn: () => getTagsFn(),
		// Tags change only when posts are published — tolerate up to 5 min
		// staleness so feed mounts + palette opens don't refetch on every nav.
		staleTime: 5 * 60 * 1000
	});
