"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { inputCls, btnOutline, btnPrimary, btnPrimaryLg } from "@/lib/ui";

// Full-screen drawing surface: a phone-sized box is too small to sign in comfortably.
function SignatureDialog({ onDone, onClose }: { onDone: (dataUrl: string) => void; onClose: () => void }) {
  const pad = useRef<SignaturePadHandle>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background p-4 gap-3" role="dialog" aria-label="簽名">
      <div className="flex items-center justify-between">
        <span className="font-semibold">請在下方簽名</span>
        <button type="button" onClick={onClose} aria-label="關閉" className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <SignaturePad ref={pad} className="h-full" />
      </div>
      {empty && <p className="text-sm text-destructive">還沒有簽名喔</p>}
      <p className="text-xs text-muted-foreground">手機可以橫放，簽名空間會更大。</p>
      <div className="flex gap-2">
        <button type="button" className={`${btnOutline} h-11 flex-1`} onClick={() => { pad.current?.clear(); setEmpty(false); }}>
          清除重簽
        </button>
        <button
          type="button"
          className={`${btnPrimary} h-11 flex-1`}
          onClick={() => {
            if (!pad.current || pad.current.isEmpty()) return setEmpty(true);
            onDone(pad.current.toDataUrl());
          }}
        >
          完成
        </button>
      </div>
    </div>
  );
}

// Name + signature (+ optional "I agree" checkbox). Used on the public sign pages and
// in the studio-side signing dialog; the caller decides what submitting does.
export function SignForm({
  defaultName = "",
  agreeLabel,
  submitLabel = "確認簽署並送出",
  onSubmit,
}: {
  defaultName?: string;
  agreeLabel?: string;
  submitLabel?: string;
  onSubmit: (name: string, signatureImage: string) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!name.trim()) return setMessage("請填寫簽署人姓名");
    if (agreeLabel && !agreed) return setMessage("請先閱讀並勾選同意條款");
    if (!signature) return setMessage("請先點下方簽名框簽名");
    setSending(true);
    setMessage("");
    try {
      await onSubmit(name.trim(), signature);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "送出失敗");
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">簽署人姓名</span>
        <input className={inputCls} placeholder="請輸入姓名" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {agreeLabel && (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>{agreeLabel}</span>
        </label>
      )}
      <div className="space-y-1.5">
        <span className="text-sm font-medium">簽名</span>
        <button
          type="button"
          onClick={() => setSigning(true)}
          className="flex h-[180px] w-full items-center justify-center rounded-md border border-dashed border-input bg-white text-sm text-muted-foreground hover:border-primary"
        >
          {signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signature} alt="簽名" className="max-h-full max-w-full object-contain" />
          ) : (
            "點一下這裡，放大簽名"
          )}
        </button>
        {signature && (
          <div className="flex justify-end gap-2">
            <button type="button" className={btnOutline} onClick={() => setSignature("")}>清除</button>
            <button type="button" className={btnOutline} onClick={() => setSigning(true)}>重新簽名</button>
          </div>
        )}
      </div>
      <button type="button" disabled={sending} onClick={submit} className={`${btnPrimaryLg} w-full disabled:opacity-50`}>
        {sending ? "送出中..." : submitLabel}
      </button>
      {message && <p className="text-sm text-destructive">{message}</p>}
      {signing && (
        <SignatureDialog
          onDone={(url) => {
            setSignature(url);
            setSigning(false);
            setMessage("");
          }}
          onClose={() => setSigning(false)}
        />
      )}
    </div>
  );
}
