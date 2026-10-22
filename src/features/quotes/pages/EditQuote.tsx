"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetQuote, useUpdateQuote } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { QuoteForm } from "../components/QuoteForm";

export function EditQuote() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: quote, isLoading } = useGetQuote(quoteId, { query: { enabled: !!quoteId } });
  const updateQuote = useUpdateQuote();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!quote) return <div className="p-8 text-center text-destructive">找不到此報價單</div>;

  return (
    <QuoteForm
      initial={quote}
      heading="編輯報價單"
      subheading={quote.quote_number}
      backHref={`/quotes/${quote.id}`}
      submitLabel="儲存變更"
      isPending={updateQuote.isPending}
      onSubmit={(data) =>
        updateQuote.mutate(
          { id: quote.id, data },
          {
            onSuccess: () => {
              toast.success("報價單已更新");
              invalidateApi(queryClient, "/api/quotes");
              router.push(`/quotes/${quote.id}`);
            },
            onError: () => toast.error("儲存失敗"),
          },
        )
      }
    />
  );
}
