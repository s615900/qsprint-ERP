import type { QueryClient } from "@tanstack/react-query";

// Orval keys lists as ["/api/orders", params] but details as ["/api/orders/12"],
// so a plain prefix key can't reach both — match on the URL string instead.
export function invalidateApi(queryClient: QueryClient, ...prefixes: string[]) {
  return queryClient.invalidateQueries({
    predicate: (q) => {
      const key = q.queryKey[0];
      return typeof key === "string" && prefixes.some((p) => key.startsWith(p));
    },
  });
}
