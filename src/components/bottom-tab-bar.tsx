import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Settings, LogOut } from "lucide-react";
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
}: {
  primaryItems: NavItem[];
  moreItems: NavItem[];
  pathname: string;
  userName: string;
  userRole: string;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((item) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to),
  );

  return (
    <>
      <div className="app-bottom-tabs fixed bottom-0 left-0 right-0 z-40 px-3 md:hidden">
        <nav className="app-surface mx-auto flex max-w-md items-center gap-1 rounded-[28px] px-2 py-2">
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
                    "relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-2xl px-1.5 py-2 text-[10.5px] font-semibold",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-tab-active"
                      className="absolute inset-0 rounded-2xl"
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
          {moreItems.length > 0 && (
            <motion.button
              type="button"
              onClick={() => setMoreOpen(true)}
              whileTap={{ scale: 0.98 }}
              animate={{ y: moreActive ? -1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 overflow-hidden rounded-2xl px-1.5 py-2 text-[10.5px] font-semibold",
                moreActive ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {moreActive && (
                <motion.span
                  layoutId="bottom-tab-active"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: "var(--gradient-primary)" }}
                  transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-1">
                <MoreHorizontal className="h-[19px] w-[19px]" />
                <span>Mais</span>
              </span>
            </motion.button>
          )}
        </nav>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="safe-bottom-bar rounded-t-[28px] border-white/70 bg-white/90 backdrop-blur-2xl"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription>Navegação e conta</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "pressable flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-semibold",
                    active
                      ? "border-primary/35 text-primary"
                      : "border-border bg-white/75 text-foreground/80 hover:bg-white",
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
          <div className="mt-5 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenProfile();
              }}
              className="pressable flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/75"
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
