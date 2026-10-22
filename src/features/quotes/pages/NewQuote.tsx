"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateQuote } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { QuoteForm } from "../components/QuoteForm";

export function NewQuote() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createQuote = useCreateQuote();

  return (
    <QuoteForm
      heading="新增報價單"
      subheading="建立報價後可列印或存成 PDF 傳給客戶，客戶同意後一鍵轉為訂單。"
      backHref="/quotes"
      submitLabel="建立報價單"
      isPending={createQuote.isPending}
      onSubmit={(data) =>
        createQuote.mutate(
          { data },
          {
            onSuccess: (quote) => {
              toast.success("報價單已建立");
              invalidateApi(queryClient, "/api/quotes");
              router.push(`/quotes/${quote.id}`);
            },
            onError: () => toast.error("建立失敗，請檢查必填欄位"),
          },
        )
      }
    />
  );
}
