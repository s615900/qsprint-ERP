"use client";

// Canvas signature pad shared by the customer sign pages and the studio-side signing dialog.
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string;
}

// `rotated`: the pad sits inside a parent turned 90° clockwise, so pointer coordinates must be mapped back.
export function SignaturePad({ ref, className = "h-[180px]", rotated = false }: { ref: Ref<SignaturePadHandle>; className?: string; rotated?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    // Layout size, not getBoundingClientRect: that one is swapped when a parent is rotated.
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1B2530";
  }, []);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn.current = false;
    },
    isEmpty: () => !hasDrawn.current,
    toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }));

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rotated) return { x: e.clientY - rect.top, y: rect.right - e.clientX };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const stop = () => {
    drawing.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full touch-none rounded-md border border-dashed border-input bg-white ${className}`}
      onPointerDown={(e) => {
        const ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        drawing.current = true;
        hasDrawn.current = true;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        const p = pos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    />
  );
}
