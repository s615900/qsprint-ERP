"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Printer, Trash2, Link2, PenLine, FileText, ShoppingBag, FolderKanban,
  CheckCircle2, Eye, RefreshCcw, Ban, Archive, Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetContract,
  useUpdateContract,
  useDeleteContract,
  useCreateContractSignLink,
  useSignContractAsStaff,
  useReviseContract,
  useCreateProject,
  useGetCompanySettings,
} from "@/lib/api-client";
import { LineItemsTable } from "@/components/LineItemsEditor";
import { SignForm } from "@/components/SignForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { invalidateApi } from "@/lib/invalidate";
import { copyText } from "@/lib/copy";
import { CONTENT_LOCKED_MESSAGE, displayContractStatus, isContentLocked } from "@/lib/contractStatus";
import { btnOutline, btnPrimary, btnDanger } from "@/lib/ui";

const fmt = (d: string | null | undefined, f = "yyyy/MM/dd") => (d ? format(new Date(d), f) : "");

function SignatureBlock({ title, name, signedAt, image }: { title: string; name?: string | null; signedAt?: string | null; image?: string | null }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="h-28 border-b border-foreground/40 flex items-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt={`${title}簽名`} className="max-h-28" /> : <span className="text-xs text-muted-foreground/60 pb-2">尚未簽署</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        {name ? `${name}・${fmt(signedAt, "yyyy/MM/dd HH:mm")}` : " "}
      </p>
    </div>
  );
}

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signOpen, setSignOpen] = useState(false);

  const { data: contract, isLoading } = useGetContract(contractId, { query: { enabled: !!contractId } });
  const { data: company } = useGetCompanySettings();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const signLink = useCreateContractSignLink();
  const staffSign = useSignContractAsStaff();
  const revise = useReviseContract();
  const createProject = useCreateProject();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!contract) return <div className="p-8 text-center text-destructive">找不到此合約</div>;

  const refresh = () => invalidateApi(queryClient, "/api/contracts");
  const status = displayContractStatus(contract);
  const locked = isContentLocked(contract);
  const closed = contract.status === "作廢" || contract.status === "已結案";
  const hasSignature = !!(contract.customer_signed_at || contract.staff_signed_at);

  const setStatus = (s: "已結案" | "作廢" | "草稿", msg: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    updateContract.mutate(
      { id: contract.id, data: { status: s } },
      { onSuccess: () => { toast.success(msg); refresh(); }, onError: () => toast.error("更新失敗") },
    );
  };

  const handleCopyLink = () =>
    signLink.mutate(
      { id: contract.id },
      {
        onSuccess: async (link) => {
          const url = `${window.location.origin}${link.path}`;
          toast.success((await copyText(url)) ? "簽署連結已複製，傳給客戶即可" : `簽署連結：${url}`);
          refresh();
        },
        onError: () => toast.error("產生連結失敗"),
      },
    );

  const handleRevise = () => {
    if (!confirm("將作廢這份合約，並複製內容建立新的草稿（簽名會清空，需重新簽署）。確定嗎？")) return;
    revise.mutate(
      { id: contract.id },
      {
        onSuccess: (next) => {
          toast.success(`已建立新版本 ${next.contract_number}`);
          refresh();
          router.push(`/contracts/${next.id}`);
        },
        onError: () => toast.error("建立新版本失敗"),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm("確定要刪除這份合約嗎？刪除後無法恢復。")) return;
    deleteContract.mutate(
      { id: contract.id },
      {
        onSuccess: () => { toast.success("合約已刪除"); refresh(); router.push("/contracts"); },
        onError: () => toast.error("刪除失敗（已有簽署紀錄的合約請改用作廢）"),
      },
    );
  };

  const handleCreateProject = () =>
    createProject.mutate(
      {
        data: {
          name: contract.title,
          customer_id: contract.customer_id,
          order_id: contract.order_id,
          contract_id: contract.id,
          contact_name: contract.contact_name,
          contact_phone: contract.contact_phone,
          status: "籌備中",
        },
      },
      {
        onSuccess: () => { toast.success("已建立專案"); invalidateApi(queryClient, "/api/projects"); router.push("/projects"); },
        onError: () => toast.error("建立專案失敗"),
      },
    );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="print:hidden space-y-4">
        <Link href="/contracts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回合約管理
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>{status.label}</span>
          <div className="flex flex-wrap gap-2">
            {!closed && (
              <button onClick={handleCopyLink} disabled={signLink.isPending} className={btnOutline}>
                <Link2 className="w-4 h-4" /> 複製客戶簽署連結
              </button>
            )}
            {!closed && !contract.staff_signed_at && (
              <button onClick={() => setSignOpen(true)} className={btnPrimary}>
                <PenLine className="w-4 h-4" /> 工作室簽署
              </button>
            )}
            <button onClick={() => window.print()} className={btnOutline}>
              <Printer className="w-4 h-4" /> 列印 / 存 PDF
            </button>
            {!locked && !closed && (
              <Link href={`/contracts/${contract.id}/edit`} className={btnOutline}>
                <Pencil className="w-4 h-4" /> 編輯
              </Link>
            )}
            {locked && !closed && (
              <button onClick={handleRevise} disabled={revise.isPending} className={btnOutline}>
                <RefreshCcw className="w-4 h-4" /> 作廢並建立新版本
              </button>
            )}
            {contract.status === "已簽約" && (
              <button onClick={() => setStatus("已結案", "已標記結案", "標記為已結案後，合約內容與簽署都會封存。確定嗎？")} className={btnOutline}>
                <Archive className="w-4 h-4" /> 結案
              </button>
            )}
            {closed && (
              <button onClick={() => setStatus("草稿", "已恢復")} className={btnOutline}>
                <Undo2 className="w-4 h-4" /> 恢復
              </button>
            )}
            {!closed && hasSignature && (
              <button onClick={() => setStatus("作廢", "合約已作廢", "確定要作廢這份合約嗎？客戶的簽署連結將失效。")} className={btnDanger}>
                <Ban className="w-4 h-4" /> 作廢
              </button>
            )}
            {!hasSignature && (
              <button onClick={handleDelete} className={btnDanger}>
                <Trash2 className="w-4 h-4" /> 刪除
              </button>
            )}
          </div>
        </div>

        {locked && !closed && <p className="text-xs text-muted-foreground">{CONTENT_LOCKED_MESSAGE}</p>}
        {contract.customer_signed_at ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            客戶 {contract.customer_signer_name} 已於 {fmt(contract.customer_signed_at, "yyyy/MM/dd HH:mm")} 簽署
          </div>
        ) : contract.customer_read_at ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Eye className="w-4 h-4" />
            客戶已於 {fmt(contract.customer_read_at, "yyyy/MM/dd HH:mm")} 打開簽署連結，尚未簽名
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {contract.quote_id && (
            <Link href={`/quotes/${contract.quote_id}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <FileText className="w-4 h-4" /> 來自報價單 {contract.quote_number}
            </Link>
          )}
          {contract.order_id && (
            <Link href={`/orders/${contract.order_id}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <ShoppingBag className="w-4 h-4" /> 訂單 {contract.order_number}
            </Link>
          )}
          {contract.previous_contract_id && (
            <Link href={`/contracts/${contract.previous_contract_id}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <RefreshCcw className="w-4 h-4" /> 修訂自舊版合約
            </Link>
          )}
          {!closed && (
            <button onClick={handleCreateProject} disabled={createProject.isPending} className="flex items-center gap-1.5 text-primary hover:underline">
              <FolderKanban className="w-4 h-4" /> 建立專案
            </button>
          )}
        </div>
      </div>

      {/* The document itself — this is what prints. */}
      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-10 space-y-8 print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Logo className="w-8 h-8" />
              <span className="font-semibold tracking-wide">{company?.name || "青春止秒攝影工作室"}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4">{contract.title}</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">{contract.contract_number}</p>
          </div>
          <div className="text-sm space-y-1 sm:text-right">
            <div><span className="text-muted-foreground">立約日期　</span>{fmt(contract.created_at)}</div>
            {contract.start_date && <div><span className="text-muted-foreground">合約起日　</span>{fmt(contract.start_date)}</div>}
            {contract.end_date && <div><span className="text-muted-foreground">合約迄日　</span>{fmt(contract.end_date)}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-lg bg-muted/40 p-4 print:bg-transparent print:p-0">
          <div>
            <p className="text-xs text-muted-foreground mb-1">委託方（甲方）</p>
            <p className="font-medium">{contract.contact_name}</p>
            <p className="text-sm text-muted-foreground">{contract.contact_phone}</p>
            {contract.contact_email && <p className="text-sm text-muted-foreground">{contract.contact_email}</p>}
            {contract.tax_id && <p className="text-sm text-muted-foreground">統編 {contract.tax_id}</p>}
            {contract.address && <p className="text-sm text-muted-foreground">{contract.address}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">服務提供方（乙方）</p>
            <p className="font-medium">{company?.name || "青春止秒攝影工作室"}</p>
            {company?.owner && <p className="text-sm text-muted-foreground">負責人 {company.owner}</p>}
            {company?.tax_id && <p className="text-sm text-muted-foreground">統編 {company.tax_id}</p>}
            {company?.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
            {company?.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
          </div>
        </div>

        <LineItemsTable
          items={contract.items}
          discount={contract.discount}
          total={contract.total}
          taxMode={contract.tax_mode}
          taxRate={contract.tax_rate}
          taxAmount={contract.tax_amount}
        />

        {contract.notes && (
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">備註</p>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{contract.notes}</p>
          </div>
        )}
        {contract.terms && (
          <div className="pt-6 border-t border-border">
            <div className="rich-content text-sm text-foreground/80" dangerouslySetInnerHTML={{ __html: contract.terms }} />
          </div>
        )}
        {contract.nda && (
          <div className="pt-6 border-t border-border">
            <div className="rich-content text-sm text-foreground/80" dangerouslySetInnerHTML={{ __html: contract.nda }} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-border break-inside-avoid">
          <SignatureBlock title="甲方簽署（客戶）" name={contract.customer_signer_name} signedAt={contract.customer_signed_at} image={contract.customer_signature} />
          <SignatureBlock title="乙方簽署（工作室）" name={contract.staff_signer_name} signedAt={contract.staff_signed_at} image={contract.staff_signature} />
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>工作室簽署</DialogTitle>
            <DialogDescription>以工作室名義簽署 {contract.contract_number}。</DialogDescription>
          </DialogHeader>
          <SignForm
            defaultName={company?.owner ?? ""}
            onSubmit={async (name, image) => {
              await staffSign.mutateAsync({ id: contract.id, data: { signer_name: name, signature_image: image } });
              toast.success("已完成工作室簽署");
              setSignOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
