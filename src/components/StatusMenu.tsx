"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Colored status pill that opens a menu of the other statuses.
export function StatusMenu<T extends string>({
  value,
  options,
  colors,
  onChange,
}: {
  value: T;
  options: readonly T[];
  colors: Record<string, string>;
  onChange: (status: T) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${colors[value] ?? "bg-muted text-muted-foreground border-border"}`}
      >
        {value}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((s) => (
            <DropdownMenu.Item
              key={s}
              onClick={() => s !== value && onChange(s)}
              className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${value === s ? "font-bold text-primary" : ""}`}
            >
              {s}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
