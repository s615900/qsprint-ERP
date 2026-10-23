/* eslint-disable @next/next/no-img-element */
// Round avatar: the uploaded photo, else the first character of the name.
export function StaffAvatar({ name, src, className = "" }: { name: string; src?: string | null; className?: string }) {
  return src ? (
    <img src={src} alt={name} className={`rounded-full object-cover shrink-0 ${className}`} />
  ) : (
    <span className={`rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}>{name.charAt(0)}</span>
  );
}

// Center-crop to a square and shrink to a small JPEG data URL.
export function resizeToAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("無法讀取這張圖片"));
    };
    img.src = url;
  });
}
