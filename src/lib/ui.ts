// Shared Tailwind class strings for the hand-rolled forms and buttons used across features.
export const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
export const smInputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
// Toolbar filter dropdowns: one height, width follows the longest option so text is never cut off.
export const filterSelectCls =
  "h-10 w-auto min-w-[7.5rem] rounded-md border border-input bg-background pl-3 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const textareaCls =
  "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 transition-colors disabled:opacity-50 disabled:pointer-events-none";
export const btnOutline = `${btnBase} border border-input bg-background hover:bg-accent`;
export const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`;
export const btnDanger = `${btnBase} text-destructive border border-destructive/30 hover:bg-destructive/10`;
export const btnPrimaryLg =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate";

export const cardCls = "rounded-xl border bg-card shadow-sm";
