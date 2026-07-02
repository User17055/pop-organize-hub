import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
      <nav className="safe-bottom-bar fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur md:hidden">
        {primaryItems.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-9 items-center justify-center rounded-full transition-all",
                  active && "bg-primary/10",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
        {moreItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-9 items-center justify-center rounded-full transition-all",
                moreActive && "bg-primary/10",
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </span>
            Mais
          </button>
        )}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl safe-bottom-bar">
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
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground/80 hover:bg-muted",
                  )}
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
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
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
              className="mt-1 flex w-full items-center gap-3 rounded-xl p-2 text-left text-destructive hover:bg-destructive/5 transition-colors"
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
