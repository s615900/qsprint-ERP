"use client";

// Minimal rich-text editor (bold / italic / underline / lists) built on contentEditable,
// used for contract clauses. Uncontrolled: initialHtml is applied once on mount — change
// the `key` to load different content (e.g. after applying a template).
import { useEffect, useRef } from "react";

const TOOLS = [
  { cmd: "bold", label: <b>B</b> },
  { cmd: "italic", label: <i>I</i> },
  { cmd: "underline", label: <u>U</u> },
  { cmd: "insertUnorderedList", label: "• 清單" },
  { cmd: "insertOrderedList", label: "1. 清單" },
];

export function RichEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editableRef.current) editableRef.current.innerHTML = initialHtml;
    // Applied on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <div className="flex gap-1 border-b border-input bg-muted/40 p-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.cmd}
            type="button"
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent"
            // Prevent the editor from losing its selection when the button is pressed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editableRef.current?.focus();
              document.execCommand(tool.cmd, false);
              onChange(editableRef.current?.innerHTML ?? "");
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        className="rich-content max-h-80 min-h-[140px] overflow-y-auto px-3 py-2.5 text-sm focus:outline-none"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}
