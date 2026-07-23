import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Download, MoreHorizontal, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type NavItem = {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  exact?: boolean;
};

export function BottomTabBar({
  primaryItems,
  moreItems,
  pathname,
  userName,
  userRole,
  onOpenProfile,
  onLogout,
  showLogout = true,
  showInstall = false,
  onInstall,
}: {
  primaryItems: NavItem[];
  moreItems: NavItem[];
  pathname: string;
  userName: string;
  userRole: string;
  onOpenProfile: () => void;
  onLogout: () => void;
  showLogout?: boolean;
  showInstall?: boolean;
  onInstall?: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((item) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to),
  );

  return (
    <>
      <div className="app-bottom-tabs fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-3 lg:hidden">
        <nav className="app-surface bottom-tab-glass mx-auto flex w-full max-w-md items-center gap-0.5 rounded-[24px] px-1.5 py-1.5 sm:gap-1 sm:rounded-[28px] sm:px-2 sm:py-2">
          {primaryItems.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="min-w-0 flex-1">
                <motion.span
                  whileTap={{ scale: 0.98 }}
                  animate={{ y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
                  className={cn(
                    "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 py-1.5 text-[10px] font-semibold sm:px-1.5 sm:py-2 sm:text-[10.5px]",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-tab-active"
                      className="bottom-tab-active-indicator absolute inset-0 rounded-2xl"
                      style={{ background: "var(--gradient-primary)" }}
                      transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <Icon className="h-[19px] w-[19px]" />
                    <span className="max-w-full truncate">{item.label}</span>
                  </span>
                </motion.span>
              </Link>
            );
          })}
          <motion.button
            type="button"
            onClick={() => setMoreOpen(true)}
            whileTap={{ scale: 0.98 }}
            animate={{ y: moreActive ? -1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
            className={cn(
              "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 py-1.5 text-[10px] font-semibold sm:px-1.5 sm:py-2 sm:text-[10.5px]",
              moreActive ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {moreActive && (
              <motion.span
                layoutId="bottom-tab-active"
                className="bottom-tab-active-indicator absolute inset-0 rounded-2xl"
                style={{ background: "var(--gradient-primary)" }}
                transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-1">
              <MoreHorizontal className="h-[19px] w-[19px]" />
              <span>Mais</span>
            </span>
          </motion.button>
        </nav>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="safe-bottom-bar max-h-[min(88dvh,48rem)] overflow-y-auto rounded-t-[28px] border-border/70 bg-card/98 px-4 pb-4 pt-5 backdrop-blur-2xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:px-6"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription>Navegação e conta</SheetDescription>
          </SheetHeader>
          {moreItems.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "pressable flex min-h-[74px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center text-[11px] font-semibold sm:p-3 sm:text-xs",
                      active
                        ? "bg-primary/12 text-primary"
                        : "bg-muted/55 text-foreground/85 hover:bg-muted",
                    )}
                    style={
                      active
                        ? { background: "color-mix(in oklab, var(--primary) 12%, white)" }
                        : undefined
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          <div
            className={cn("border-border pt-4", moreItems.length > 0 ? "mt-5 border-t" : "mt-3")}
          >
            {showInstall && onInstall && (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onInstall();
                }}
                className="pressable mb-2 flex w-full items-center gap-3 rounded-2xl bg-primary/10 p-3 text-left text-primary"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm font-semibold">Instalar no celular</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenProfile();
              }}
              className="pressable flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-muted"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{userName}</div>
                <div className="truncate text-xs text-muted-foreground">{userRole}</div>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
            {showLogout && (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onLogout();
                }}
                className="pressable mt-1 flex w-full items-center gap-3 rounded-2xl p-2 text-left text-destructive hover:bg-destructive/5"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
