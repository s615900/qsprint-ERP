"use client";

import { useState } from "react";
import type { Project, ProjectInput } from "@/lib/api-client";
import { useListStaff } from "@/lib/api-client";
import { CustomerPicker } from "@/components/CustomerPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inputCls, textareaCls, btnOutline, btnPrimary } from "@/lib/ui";
import { PROJECT_STATUSES, PROJECT_TYPES, CANCELLED } from "../constants";

export function ProjectDialog({
  open,
  onOpenChange,
  initial,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Project | null;
  isPending: boolean;
  onSubmit: (data: ProjectInput) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `編輯專案 ${initial.project_number}` : "新增專案"}</DialogTitle>
        </DialogHeader>
        {/* Keyed so each open starts from the right initial values. */}
        <ProjectForm key={initial?.id ?? "new"} initial={initial ?? undefined} isPending={isPending} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: Project;
  isPending: boolean;
  onSubmit: (data: ProjectInput) => void;
  onCancel: () => void;
}) {
  const { data: staff } = useListStaff();
  const [customerId, setCustomerId] = useState<number | null>(initial?.customer_id ?? null);
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<string>(initial?.project_type ?? PROJECT_TYPES[0]);
  const [status, setStatus] = useState<string>(initial?.status ?? PROJECT_STATUSES[0]);
  const [shootDate, setShootDate] = useState(initial?.shoot_date ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [assigned, setAssigned] = useState(initial?.assigned_staff ?? "");
  const [link, setLink] = useState(initial?.delivery_link ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          customer_id: customerId,
          order_id: initial?.order_id ?? null,
          contract_id: initial?.contract_id ?? null,
          booking_id: initial?.booking_id ?? null,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim() || null,
          project_type: type,
          status: status as ProjectInput["status"],
          shoot_date: shootDate || null,
          due_date: dueDate || null,
          location: location.trim() || null,
          assigned_staff: assigned || null,
          delivery_link: link.trim() || null,
          notes: notes.trim() || null,
        });
      }}
    >
      <CustomerPicker
        onSelect={(c) => {
          setCustomerId(c.id);
          setContactName(c.name);
          setContactPhone(c.phone);
          if (!name) setName(`${c.name} 拍攝專案`);
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">客戶 / 聯絡人 *</span>
          <input className={inputCls} value={contactName} onChange={(e) => { setContactName(e.target.value); setCustomerId(null); }} required />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">聯絡電話</span>
          <input className={inputCls} value={contactPhone ?? ""} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
        <label className="space-y-1.5 col-span-2">
          <span className="text-sm font-medium">專案名稱 *</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：王小明婚紗外拍" required />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">類型</span>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {!(PROJECT_TYPES as readonly string[]).includes(type) && <option>{type}</option>}
            {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">進度</span>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {[...PROJECT_STATUSES, CANCELLED].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">拍攝日期</span>
          <input type="date" className={inputCls} value={shootDate ?? ""} onChange={(e) => setShootDate(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">預計交件日</span>
          <input type="date" className={inputCls} value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">拍攝地點</span>
          <input className={inputCls} value={location ?? ""} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">負責人員</span>
          <select className={inputCls} value={assigned ?? ""} onChange={(e) => setAssigned(e.target.value)}>
            <option value="">未指派</option>
            {assigned && !staff?.some((s) => s.name === assigned) && <option>{assigned}</option>}
            {staff?.filter((s) => s.active).map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 col-span-2">
          <span className="text-sm font-medium">雲端交付連結</span>
          <input className={inputCls} value={link ?? ""} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </label>
        <label className="space-y-1.5 col-span-2">
          <span className="text-sm font-medium">備註</span>
          <textarea className={textareaCls} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`${btnOutline} h-10 px-4`}>取消</button>
        <button type="submit" disabled={isPending} className={`${btnPrimary} h-10 px-5`}>
          {isPending ? "儲存中..." : initial ? "儲存變更" : "建立專案"}
        </button>
      </div>
    </form>
  );
}
