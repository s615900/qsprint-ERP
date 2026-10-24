"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Printer, Trash2, ArrowRightCircle, ShoppingBag, Link2, CheckCircle2, Eye, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetQuote,
  useUpdateQuote,
  useDeleteQuote,
  useConvertQuoteToOrder,
  useCreateQuoteSignLink,
  useCreateContractFromQuote,
  QuoteStatus,
} from "@/lib/api-client";
import { StatusMenu } from "@/components/StatusMenu";
import { LineItemsTable } from "@/components/LineItemsEditor";
import { invalidateApi } from "@/lib/invalidate";
import { copyText } from "@/lib/copy";
import { QUOTE_STATUS_COLOR, isExpired } from "../constants";

const btn =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useGetQuote(quoteId, { query: { enabled: !!quoteId } });
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const convert = useConvertQuoteToOrder();
  const signLink = useCreateQuoteSignLink();
  const createContract = useCreateContractFromQuote();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!quote) return <div className="p-8 text-center text-destructive">找不到此報價單</div>;

  const handleStatus = (s: QuoteStatus) =>
    updateQuote.mutate(
      { id: quote.id, data: { status: s } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          invalidateApi(queryClient, "/api/quotes");
        },
        onError: () => toast.error("更新失敗"),
      },
    );

  const handleConvert = () => {
    if (!confirm("客戶已同意這份報價？將建立一筆新訂單，報價單狀態改為「已接受」。")) return;
    convert.mutate(
      { id: quote.id },
      {
        onSuccess: (order) => {
          toast.success(`已建立訂單 ${order.order_number}`);
          invalidateApi(queryClient, "/api/quotes", "/api/orders");
          router.push(`/orders/${order.id}`);
        },
        onError: () => toast.error("轉換失敗，此報價單可能已經轉過訂單"),
      },
    );
  };

  const handleCopyLink = () =>
    signLink.mutate(
      { id: quote.id },
      {
        onSuccess: async (link) => {
          const ok = await copyText(`${window.location.origin}${link.path}`);
          toast.success(ok ? "簽署連結已複製，傳給客戶即可" : `簽署連結：${window.location.origin}${link.path}`);
          invalidateApi(queryClient, "/api/quotes");
        },
        onError: () => toast.error("產生連結失敗"),
      },
    );

  const handleCreateContract = () =>
    createContract.mutate(
      { id: quote.id },
      {
        onSuccess: (contract) => {
          toast.success(`已建立合約草稿 ${contract.contract_number}`);
          invalidateApi(queryClient, "/api/contracts");
          router.push(`/contracts/${contract.id}`);
        },
        onError: () => toast.error("建立合約失敗"),
      },
    );

  const handleDelete = () => {
    if (!confirm("確定要刪除這張報價單嗎？刪除後無法恢復。")) return;
    deleteQuote.mutate(
      { id: quote.id },
      {
        onSuccess: () => {
          toast.success("報價單已刪除");
          invalidateApi(queryClient, "/api/quotes");
          router.push("/quotes");
        },
        onError: () => toast.error("刪除失敗"),
      },
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="print:hidden space-y-4">
        <Link href="/quotes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回報價系統
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusMenu value={quote.status} options={Object.values(QuoteStatus)} colors={QUOTE_STATUS_COLOR} onChange={handleStatus} />
            {isExpired(quote) && <span className="text-xs text-destructive">已超過有效期限</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopyLink} disabled={signLink.isPending} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <Link2 className="w-4 h-4" /> 複製簽署連結
            </button>
            <button onClick={handleCreateContract} disabled={createContract.isPending} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <FileSignature className="w-4 h-4" /> 建立合約
            </button>
            <button onClick={() => window.print()} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <Printer className="w-4 h-4" /> 列印 / 存 PDF
            </button>
            <Link href={`/quotes/${quote.id}/edit`} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <Pencil className="w-4 h-4" /> 編輯
            </Link>
            <button onClick={handleDelete} className={`${btn} text-destructive border border-destructive/30 hover:bg-destructive/10`}>
              <Trash2 className="w-4 h-4" /> 刪除
            </button>
          </div>
        </div>

        {quote.signed_at ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            客戶 {quote.signer_name} 已於 {format(new Date(quote.signed_at), "yyyy/MM/dd HH:mm")} 線上簽署同意
          </div>
        ) : quote.read_at ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Eye className="w-4 h-4" />
            客戶已於 {format(new Date(quote.read_at), "yyyy/MM/dd HH:mm")} 打開簽署連結，尚未簽名
          </div>
        ) : null}

        {quote.order_id ? (
          <Link
            href={`/orders/${quote.order_id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> 這張報價單已轉為訂單</span>
            <span className="font-medium">查看訂單 →</span>
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm text-foreground/80">客戶同意報價了嗎？轉成訂單後就能開始記錄收款。</span>
            <button onClick={handleConvert} disabled={convert.isPending} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`}>
              <ArrowRightCircle className="w-4 h-4" /> {convert.isPending ? "轉換中..." : "轉為訂單"}
            </button>
          </div>
        )}
      </div>

      {/* The document itself — this is what prints. */}
      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-10 space-y-8 print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Logo className="w-8 h-8" />
              <span className="font-semibold tracking-wide">青春止秒攝影工作室</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4">報價單</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">{quote.quote_number}</p>
          </div>
          <div className="text-sm space-y-1 sm:text-right">
            <div><span className="text-muted-foreground">報價日期　</span>{format(new Date(quote.created_at), "yyyy/MM/dd")}</div>
            {quote.valid_until && (
              <div><span className="text-muted-foreground">有效期限　</span>{format(new Date(quote.valid_until), "yyyy/MM/dd")}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-lg bg-muted/40 p-4 print:bg-transparent print:p-0">
          <div>
            <p className="text-xs text-muted-foreground mb-1">客戶</p>
            <p className="font-medium">{quote.contact_name}</p>
            <p className="text-sm text-muted-foreground">{quote.contact_phone}</p>
            {quote.contact_email && <p className="text-sm text-muted-foreground">{quote.contact_email}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">主旨</p>
            <p className="font-medium">{quote.title}</p>
          </div>
        </div>

        <LineItemsTable
          items={quote.items}
          discount={quote.discount}
          total={quote.total}
          taxMode={quote.tax_mode}
          taxRate={quote.tax_rate}
          taxAmount={quote.tax_amount}
        />

        {quote.notes && (
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">備註與條款</p>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{quote.notes}</p>
          </div>
        )}
        {quote.terms && (
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">客戶需同意之條款</p>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{quote.terms}</p>
          </div>
        )}
        {quote.signed_at && quote.signature_image && (
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">客戶簽名</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={quote.signature_image} alt="客戶簽名" className="h-24 border border-dashed border-border rounded bg-white" />
            <p className="text-xs text-muted-foreground mt-1">
              {quote.signer_name}・{format(new Date(quote.signed_at), "yyyy/MM/dd HH:mm")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
