"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, FolderKanban, Plus, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInvoices,
  useListProjects,
  useListContracts,
  useCreateProject,
  useGetCustomer,
  type Order,
} from "@/lib/api-client";
import { IssueInvoiceDialog } from "@/features/invoices/components/IssueInvoiceDialog";
import { INVOICE_STATUS_COLOR } from "@/features/invoices/constants";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { formatTWD } from "@/lib/money";
import { displayContractStatus } from "@/lib/contractStatus";
import { btnOutline, cardCls } from "@/lib/ui";

// Invoices, project and contract tied to one order, with shortcuts to create them.
export function OrderBusinessPanel({ order }: { order: Order }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: invoices } = useListInvoices({ order_id: order.id }, { query: { queryKey: ["/api/invoices", { order_id: order.id }] } });
  const { data: projects } = useListProjects({ order_id: order.id }, { query: { queryKey: ["/api/projects", { order_id: order.id }] } });
  const { data: contracts } = useListContracts(
    order.customer_id ? { customer_id: order.customer_id } : {},
    { query: { queryKey: ["/api/contracts", { customer_id: order.customer_id ?? null }] } },
  );
  const { data: customer } = useGetCustomer(order.customer_id ?? 0, { query: { enabled: !!order.customer_id, queryKey: ["/api/customers", order.customer_id] } });
  const createProject = useCreateProject();

  const live = invoices?.filter((i) => i.status === "已開立") ?? [];
  const invoiced = live.reduce((s, i) => s + i.total - i.allowance_total, 0);
  const remaining = Math.max(0, order.total - invoiced);
  const related = contracts?.filter((c) => c.order_id === order.id || (order.quote_id && c.quote_id === order.quote_id)) ?? [];

  const handleCreateProject = () =>
    createProject.mutate(
      {
        data: {
          name: order.title,
          customer_id: order.customer_id,
          order_id: order.id,
          booking_id: order.booking_id,
          contact_name: order.contact_name,
          contact_phone: order.contact_phone,
          due_date: order.delivery_date,
          status: "籌備中",
        },
      },
      {
        onSuccess: () => { toast.success("已建立專案"); invalidateApi(queryClient, "/api/projects"); router.push("/projects"); },
        onError: (err) => toast.error(apiErrorMessage(err, "建立專案失敗")),
      },
    );

  return (
    <div className="print:hidden grid gap-6 md:grid-cols-2">
      <div className={cardCls}>
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> 發票</h2>
          <button onClick={() => setInvoiceOpen(true)} className={btnOutline}><Plus className="w-4 h-4" /> 開立發票</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            已開立 {formatTWD(invoiced)}　尚未開立 <span className={remaining > 0 ? "text-foreground font-medium" : ""}>{formatTWD(remaining)}</span>
          </div>
          {invoices?.length === 0 && <p className="text-sm text-muted-foreground/70">還沒有為這筆訂單開過發票</p>}
          <ul className="divide-y divide-border">
            {invoices?.map((i) => (
              <li key={i.id} className="py-2 flex items-center gap-3 text-sm">
                <Link href={`/accounting/invoices/${i.id}`} className={`font-mono text-xs text-primary hover:underline ${i.status === "已作廢" ? "line-through" : ""}`}>{i.invoice_number}</Link>
                <span className="text-xs text-muted-foreground">{format(new Date(i.invoice_date), "MM/dd")}</span>
                <span className="flex-1 text-right tabular-nums">{formatTWD(i.total)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${INVOICE_STATUS_COLOR[i.status]}`}>{i.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <div className={cardCls}>
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <h2 className="font-semibold flex items-center gap-2"><FolderKanban className="w-4 h-4 text-primary" /> 專案進度</h2>
            {projects?.length === 0 && (
              <button onClick={handleCreateProject} disabled={createProject.isPending} className={btnOutline}><Plus className="w-4 h-4" /> 建立專案</button>
            )}
          </div>
          <div className="p-4">
            {projects?.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">還沒有專案，建立後可在專案看板追蹤拍攝、修圖與交件進度</p>
            ) : (
              <ul className="space-y-2">
                {projects?.map((p) => (
                  <li key={p.id}>
                    <Link href="/projects" className="flex items-center justify-between gap-3 text-sm hover:text-primary">
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-muted text-xs">{p.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className={cardCls}>
            <div className="p-4 border-b border-border font-semibold flex items-center gap-2"><FileSignature className="w-4 h-4 text-primary" /> 合約</div>
            <ul className="p-4 space-y-2">
              {related.map((c) => {
                const st = displayContractStatus(c);
                return (
                  <li key={c.id}>
                    <Link href={`/contracts/${c.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-primary">
                      <span className="truncate">{c.contract_number}・{c.title}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs border ${st.color}`}>{st.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <IssueInvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        preset={{
          order_id: order.id,
          customer_id: order.customer_id,
          buyer_name: customer?.company_name || order.contact_name,
          buyer_tax_id: customer?.tax_id,
          total: remaining,
        }}
      />
    </div>
  );
}
