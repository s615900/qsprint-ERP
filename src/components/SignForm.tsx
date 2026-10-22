"use client";

import { useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { inputCls, btnOutline, btnPrimaryLg } from "@/lib/ui";

// Name + signature pad (+ optional "I agree" checkbox). Used on the public sign pages and
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
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!name.trim()) return setMessage("請填寫簽署人姓名");
    if (agreeLabel && !agreed) return setMessage("請先閱讀並勾選同意條款");
    if (!pad.current || pad.current.isEmpty()) return setMessage("請先在下方框內簽名");
    setSending(true);
    setMessage("");
    try {
      await onSubmit(name.trim(), pad.current.toDataUrl());
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
        <SignaturePad ref={pad} className="h-[180px]" />
        <div className="flex justify-end">
          <button type="button" className={btnOutline} onClick={() => pad.current?.clear()}>
            清除重簽
          </button>
        </div>
      </div>
      <button type="button" disabled={sending} onClick={submit} className={`${btnPrimaryLg} w-full disabled:opacity-50`}>
        {sending ? "送出中..." : submitLabel}
      </button>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
