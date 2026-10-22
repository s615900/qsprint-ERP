"use client";

import { useGetCurrentCustomer } from "@/lib/api-client";

export function useCustomerSession() {
  const { data: customer, isLoading } = useGetCurrentCustomer({
    query: {
      queryKey: ["/api/auth/me"],
      retry: false,
    },
  });

  return {
    customer: customer ?? null,
    isLoggedIn: !!customer,
    isLoading,
  };
}
