"use client";

import { Logo } from "@/components/Logo";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  CalendarDays,
  CalendarClock,
  ShoppingBag,
  FileText,
  Calculator,
  FileSignature,
  FolderKanban,
  Settings,
  UserCog,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { LogOut, Package as PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  name: string;
  icon: LucideIcon;
  route: string;
  comingSoon?: boolean;
  subItems?: { name: string; icon: LucideIcon; route: string }[];
};

// Sidebar sections: related features sit together under a small heading.
const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [{ name: "儀表板", icon: LayoutDashboard, route: "/dashboard" }],
  },
  {
    title: "客戶與預約",
    items: [
      { name: "客戶管理", icon: Users, route: "/customers" },
      {
        name: "線上預約系統", icon: CalendarCheck, route: "/bookings",
        subItems: [
          { name: "預約管理", icon: ClipboardList, route: "/bookings" },
          { name: "本週檔期", icon: CalendarDays, route: "/bookings/weekly" },
          { name: "開放時段", icon: CalendarClock, route: "/bookings/schedule" },
        ],
      },
    ],
  },
  {
    title: "接案流程",
    items: [
      { name: "報價系統", icon: FileText, route: "/quotes" },
      { name: "合約管理", icon: FileSignature, route: "/contracts" },
      { name: "訂單管理", icon: ShoppingBag, route: "/orders" },
      { name: "專案進度", icon: FolderKanban, route: "/projects" },
      { name: "商品管理", icon: PackageIcon, route: "/products" },
    ],
  },
  {
    title: "財務",
    items: [
      {
        name: "會計系統", icon: Calculator, route: "/accounting",
      },
    ],
  },
  {
    title: "系統",
    items: [
      { name: "人員管理", icon: UserCog, route: "/staff" },
      { name: "設定", icon: Settings, route: "/settings" },
    ],
  },
];

function isRouteActive(location: string, route: string) {
  return location === route || location.startsWith(route + "/");
}

// The most specific sub-route that contains the current path wins, so
// /accounting/invoices/5 lights up 發票管理 and not the parent 收支記帳.
function activeSubRoute(location: string, subItems: { route: string }[]) {
  const matches = subItems.filter((s) => location === s.route || location.startsWith(s.route + "/"));
  return matches.sort((a, b) => b.route.length - a.route.length)[0]?.route;
}

async function adminLogout() {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.href = "/admin-login";
}

function LogoutButton({ compact }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={adminLogout}
      aria-label="登出"
      className={cn(
        "flex items-center gap-3 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors",
        compact ? "w-10 h-10 justify-center mx-auto my-3" : "mx-3 mb-4 px-3 py-2.5",
      )}
    >
      <LogOut className="w-4 h-4" />
      {!compact && "登出後台"}
    </button>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <Logo className="w-8 h-8" />
      <span className="font-semibold text-sidebar-foreground text-lg tracking-wide">青春止秒攝影工作室</span>
    </Link>
  );
}

// Full sidebar navigation — used on desktop and inside the mobile drawer.
function FullNav({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
      {navGroups.map((group, gi) => (
        <div key={group.title ?? "main"} className={cn("flex flex-col gap-1", gi > 0 && "mt-4")}>
          {group.title && (
            <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-sidebar-foreground/40">{group.title}</p>
          )}
          {group.items.map((item) => {
        const isActive = isRouteActive(location, item.route);

        if (item.subItems) {
          return (
            <div key={item.name} className="mb-2">
              <div className="px-3 py-2 flex items-center gap-3 text-sidebar-foreground/70 font-medium">
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex flex-col mt-1 ml-4 pl-4 border-l border-sidebar-border/50 gap-1">
                {item.subItems.map(subItem => {
                  const isSubActive = activeSubRoute(location, item.subItems!) === subItem.route;
                  return (
                    <Link
                      key={subItem.name}
                      href={subItem.route}
                      onClick={onNavigate}
                      className={cn(
                        "px-3 py-2 text-sm rounded-md transition-colors",
                        isSubActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {subItem.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        if (item.comingSoon) {
          return (
            <div
              key={item.name}
              className="flex items-center justify-between px-3 py-2.5 text-sidebar-foreground/40 rounded-md cursor-not-allowed select-none"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-500/70 border border-amber-500/20 font-medium">即將推出</span>
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.route}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors relative",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary rounded-l-md" />
            )}
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.name}</span>
          </Link>
        );
          })}
        </div>
      ))}
    </nav>
  );
}

// Icon-only rail for tablets — sub-items are flattened into their own icons.
function RailNav({ location }: { location: string }) {
  const entries = navGroups.flatMap((g) => g.items).flatMap((item) =>
    item.subItems
      ? item.subItems.map((s) => ({ ...s, comingSoon: false, active: activeSubRoute(location, item.subItems!) === s.route }))
      : [{ name: item.name, icon: item.icon, route: item.route, comingSoon: item.comingSoon, active: isRouteActive(location, item.route) }]
  );

  return (
    <nav className="flex-1 py-4 flex flex-col items-center gap-1 overflow-y-auto">
      {entries.map((entry) => (
        <Tooltip key={entry.name}>
          <TooltipTrigger asChild>
            {entry.comingSoon ? (
              <span className="w-10 h-10 flex items-center justify-center rounded-md text-sidebar-foreground/30 cursor-not-allowed">
                <entry.icon className="w-5 h-5" />
              </span>
            ) : (
              <Link
                href={entry.route}
                aria-label={entry.name}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-md transition-colors",
                  entry.active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <entry.icon className="w-5 h-5" />
              </Link>
            )}
          </TooltipTrigger>
          <TooltipContent side="right">
            {entry.name}{entry.comingSoon && "（即將推出）"}
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Desktop: full sidebar */}
      <aside className="print:hidden hidden lg:flex w-64 bg-sidebar flex-col border-r border-sidebar-border flex-shrink-0 sticky top-[env(safe-area-inset-top)] h-[calc(100dvh-env(safe-area-inset-top))]">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Brand />
        </div>
        <FullNav location={location} />
        <LogoutButton />
      </aside>

      {/* Tablet: icon rail */}
      <aside className="print:hidden hidden md:flex lg:hidden w-16 bg-sidebar flex-col border-r border-sidebar-border flex-shrink-0 sticky top-[env(safe-area-inset-top)] h-[calc(100dvh-env(safe-area-inset-top))]">
        <Link href="/dashboard" aria-label="青春止秒攝影工作室" className="h-16 flex items-center justify-center border-b border-sidebar-border">
          <Logo className="w-8 h-8" />
        </Link>
        <RailNav location={location} />
        <LogoutButton compact />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile: top bar + drawer */}
        <header className="print:hidden md:hidden sticky top-[env(safe-area-inset-top)] z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            aria-label="開啟選單"
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border text-sidebar-foreground flex flex-col [&>button]:text-sidebar-foreground">
            <SheetTitle className="h-14 flex items-center px-6 border-b border-sidebar-border">
              <Brand />
            </SheetTitle>
            <FullNav location={location} onNavigate={() => setDrawerOpen(false)} />
            <LogoutButton />
          </SheetContent>
        </Sheet>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
