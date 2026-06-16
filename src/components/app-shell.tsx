import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  Building2,
  Layers,
  Users,
  FolderKanban,
  BarChart3,
  Bell,
  Search,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { Priority, TaskStatus } from "@/lib/domain";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/setores", label: "Setores", icon: Layers },
  { to: "/grupos", label: "Grupos", icon: FolderKanban },
  { to: "/funcionarios", label: "Funcionários", icon: Users },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useWorkspaceData();
  const currentUser = data?.currentUser ?? {
    id: "u3",
    name: "João Pereira",
    email: "joao@poporganize.com",
    role: "Admin da Empresa",
  };
  const companyName = data?.company.name ?? "Pop Organize";
  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/login" });
    },
  });

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col text-sidebar-foreground sticky top-0 h-screen"
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-base leading-tight">Pop Organize</div>
              <div className="text-[11px] text-sidebar-foreground/60">{companyName}</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Navegação
          </div>
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors cursor-pointer">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">
                {currentUser.role}
              </div>
            </div>
            <Settings className="h-4 w-4 text-sidebar-foreground/50" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold text-foreground truncate">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 h-10 rounded-lg bg-muted border border-transparent focus-within:border-primary/40 focus-within:bg-background transition-colors w-72">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar tarefas, pessoas..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <button className="relative h-10 w-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Bell className="h-5 w-5 text-foreground/70" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </button>
            {actions}
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="h-10 w-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              title="Sair"
            >
              <LogOut className="h-4.5 w-4.5 text-foreground/70" />
            </button>
          </div>
        </header>
        <div className="flex-1 px-6 py-6">{children}</div>
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
    in_progress: { label: "Em andamento", cls: "bg-primary/10 text-primary" },
    waiting_review: { label: "Aguardando revisão", cls: "bg-warning/15 text-warning-foreground" },
    reopened: { label: "Reaberta", cls: "bg-destructive/10 text-destructive" },
    completed: { label: "Concluída", cls: "bg-success/15 text-success" },
    canceled: { label: "Cancelada", cls: "bg-muted text-muted-foreground line-through" },
  } as const;
  const it = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        it.cls,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {it.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map = {
    low: { label: "Baixa", cls: "bg-muted text-muted-foreground" },
    medium: { label: "Média", cls: "bg-primary/10 text-primary" },
    high: { label: "Alta", cls: "bg-warning/15 text-warning-foreground" },
    urgent: { label: "Urgente", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const it = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide",
        it.cls,
      )}
    >
      {it.label}
    </span>
  );
}
