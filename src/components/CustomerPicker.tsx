"use client";

import { useState } from "react";
import { useListCustomers, type Customer } from "@/lib/api-client";

// Search-as-you-type customer lookup used by quote/order forms.
export function CustomerPicker({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [search, setSearch] = useState("");
  const { data: results } = useListCustomers(
    { search },
    { query: { enabled: search.length > 1, queryKey: ["/api/customers", { search }] } },
  );

  return (
    <div className="relative">
      <label className="text-sm font-medium leading-none mb-2 block">搜尋現有客戶 (選填)</label>
      <input
        type="text"
        placeholder="輸入姓名或電話搜尋..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {search.length > 1 && results && (
        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">找不到符合的客戶</div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                className="p-3 hover:bg-muted cursor-pointer text-sm border-b border-border/50 last:border-0"
                onClick={() => {
                  onSelect(c);
                  setSearch("");
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.customer_number}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.phone}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
