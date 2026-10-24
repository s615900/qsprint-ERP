"use client";

// Customer-facing review & sign page, shared by quotes and contracts. No login: the link's
// signed token is the credential.
import { Logo } from "@/components/Logo";
import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import {
  useGetPublicQuote,
  useGetPublicContract,
  useSignPublicQuote,
  useSignPublicContract,
  type PublicDocument,
} from "@/lib/api-client";
import { LineItemsTable } from "@/components/LineItemsEditor";
import { SignForm } from "@/components/SignForm";
import { apiErrorMessage } from "@/lib/errors";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-muted/30 p-4 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-[640px] space-y-4">
        <header className="rounded-xl bg-sidebar p-5 text-sidebar-foreground">
          <div className="flex items-center gap-2 text-sm opacity-80"><Logo className="w-6 h-6" />{subtitle}</div>
          <h1 className="text-xl font-bold mt-1">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  );
}

export function SignDocument({ kind, token }: { kind: "quote" | "contract"; token: string }) {
  const label = kind === "quote" ? "報價單" : "合約";
  const quoteQuery = useGetPublicQuote(token, { query: { enabled: kind === "quote" && !!token, retry: false } });
  const contractQuery = useGetPublicContract(token, { query: { enabled: kind === "contract" && !!token, retry: false } });
  const query = kind === "quote" ? quoteQuery : contractQuery;
  const signQuote = useSignPublicQuote();
  const signContract = useSignPublicContract();
  const [justSigned, setJustSigned] = useState(false);

  if (!token) {
    return <Shell title={`${label}確認`}><Card title="連結無效">這個連結缺少必要參數，請向工作室確認正確的連結。</Card></Shell>;
  }
  if (query.isLoading) {
    return <Shell title={`${label}確認`}><div className="py-16 text-center text-muted-foreground animate-pulse">載入中...</div></Shell>;
  }
  if (query.isError || !query.data) {
    return (
      <Shell title={`${label}確認`}>
        <Card title="無法開啟">{apiErrorMessage(query.error, "連結無效或已失效，請向工作室確認。")}</Card>
      </Shell>
    );
  }

  const doc: PublicDocument = query.data;
  const signed = doc.signed || justSigned;
  const agreeLabel =
    kind === "quote"
      ? doc.terms ? "我已閱讀並同意上方條款，並確認接受本報價內容" : "我確認接受本報價內容"
      : "我已閱讀並同意本合約全部內容與條款";

  const submit = async (name: string, signature_image: string) => {
    try {
      if (kind === "quote") await signQuote.mutateAsync({ token, data: { signer_name: name, signature_image } });
      else await signContract.mutateAsync({ token, data: { signer_name: name, signature_image } });
    } catch (err) {
      throw new Error(apiErrorMessage(err, "送出失敗，請稍後再試"));
    }
    setJustSigned(true);
    query.refetch();
  };

  return (
    <Shell title={doc.title} subtitle={`${doc.studio_name}・${label} ${doc.number}`}>
      <Card title={`${label}資訊`}>
        <Row label="客戶" value={doc.client_name} />
        {doc.tax_id && <Row label="統一編號" value={doc.tax_id} />}
        <Row label={kind === "quote" ? "報價日期" : "立約日期"} value={doc.date ? format(new Date(doc.date), "yyyy/MM/dd") : null} />
        {doc.valid_until && <Row label={kind === "quote" ? "有效期限" : "合約迄日"} value={format(new Date(doc.valid_until), "yyyy/MM/dd")} />}
      </Card>

      <Card title="品項明細">
        <LineItemsTable
          items={doc.items}
          discount={doc.discount}
          total={doc.total}
          taxMode={doc.tax_mode}
          taxRate={doc.tax_rate}
          taxAmount={doc.tax_amount}
        />
      </Card>

      {doc.notes && (
        <Card title="備註">
          <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
        </Card>
      )}
      {doc.terms && (
        <Card title={kind === "quote" ? "條款" : "服務條款"}>
          {kind === "quote" ? (
            <p className="max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{doc.terms}</p>
          ) : (
            <div className="rich-content max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm" dangerouslySetInnerHTML={{ __html: doc.terms }} />
          )}
        </Card>
      )}
      {doc.nda && (
        <Card title="保密條款">
          <div className="rich-content max-h-72 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm" dangerouslySetInnerHTML={{ __html: doc.nda }} />
        </Card>
      )}

      {signed ? (
        <Card title="簽署狀態">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> 已完成簽署
          </div>
          {doc.signer_name && (
            <div className="mt-3">
              <Row label="簽署人" value={doc.signer_name} />
              <Row label="簽署時間" value={doc.signed_at ? format(new Date(doc.signed_at), "yyyy/MM/dd HH:mm") : null} />
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-3">感謝您的確認，工作室會與您聯繫後續事宜。</p>
        </Card>
      ) : (
        <Card title="確認並簽名">
          <SignForm agreeLabel={agreeLabel} onSubmit={submit} />
        </Card>
      )}
    </Shell>
  );
}
