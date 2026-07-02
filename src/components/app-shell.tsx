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
  CalendarDays,
  Search,
  Settings,
  LogOut,
  Camera,
  KeyRound,
  Save,
  BriefcaseBusiness,
  Sparkles,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logout, updateProfile } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { Priority, TaskStatus } from "@/lib/domain";
import { getAccessLevel, meetsAccess, type AccessLevel } from "@/lib/access";
import { NotificationsMenu } from "@/components/notifications-menu";
import { BottomTabBar, type NavItem } from "@/components/bottom-tab-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const nav: Array<NavItem & { minAccess: AccessLevel }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, minAccess: "collaborator" },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare, minAccess: "collaborator" },
  { to: "/calendario", label: "Calendário", icon: CalendarDays, minAccess: "collaborator" },
  { to: "/grupos", label: "Grupos", icon: FolderKanban, minAccess: "collaborator" },
  { to: "/setores", label: "Setores", icon: Layers, minAccess: "manager" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, minAccess: "manager" },
  { to: "/funcionarios", label: "Funcionários", icon: Users, minAccess: "admin" },
  { to: "/empresas", label: "Empresas", icon: Building2, minAccess: "admin" },
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
  const { data, isFetching } = useWorkspaceData();
  const currentUser = data?.currentUser ?? {
    id: "u3",
    name: "João Pereira",
    email: "joao@poporganize.com",
    role: "Admin da Empresa",
  };
  const currentEmployee = data?.employees.find((employee) => employee.id === currentUser.id);
  const currentDepartment = data?.departments.find(
    (department) => department.id === currentEmployee?.departmentId,
  );
  const companyName = data?.company.name ?? "Pop Organize";
  const avatar = currentEmployee?.avatar;
  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const accessLevel = getAccessLevel({
    currentUser,
    departments: data?.departments ?? [],
    groups: data?.groups ?? [],
  });
  const visibleNav = nav.filter((item) => meetsAccess(accessLevel, item.minAccess));
  const primaryMobileNav = visibleNav.filter((item) =>
    ["/", "/tarefas", "/calendario"].includes(item.to),
  );
  const moreMobileNav = visibleNav.filter((item) => !primaryMobileNav.includes(item));

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentEmployee?.name ?? currentUser.name,
    avatar: avatar ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/login" });
    },
  });
  const profileMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      avatar?: string;
      currentPassword?: string;
      newPassword?: string;
    }) => updateProfile({ data: payload }),
    onSuccess: ({ employee, currentUser: updatedCurrentUser }) => {
      queryClient.setQueryData<typeof data>(workspaceQueryKey, (current) =>
        current
          ? {
              ...current,
              currentUser: updatedCurrentUser,
              employees: current.employees.map((item) =>
                item.id === employee.id ? { ...item, ...employee } : item,
              ),
            }
          : current,
      );
      setProfileOpen(false);
      setProfileForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  function openProfile() {
    setProfileForm({
      name: currentEmployee?.name ?? currentUser.name,
      avatar: currentEmployee?.avatar ?? "",
      currentPassword: "",
      newPassword: "",
    });
    profileMutation.reset();
    setProfileOpen(true);
  }

  function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileForm((current) => ({ ...current, avatar: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    profileMutation.mutate({
      name: profileForm.name,
      avatar: profileForm.avatar || undefined,
      currentPassword: profileForm.currentPassword || undefined,
      newPassword: profileForm.newPassword || undefined,
    });
  }

  const profileError =
    profileMutation.error instanceof Error ? profileMutation.error.message : null;

  return (
    <div className="native-viewport flex w-full bg-background">
      {/* Sidebar (desktop/tablet only) */}
      <aside
        className="native-sidebar sticky top-0 hidden h-screen w-64 flex-col border-r border-sidebar-border text-sidebar-foreground md:flex"
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div className="px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-[var(--shadow-elegant)]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold leading-tight">
                Pop Organize
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/55">{companyName}</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-2">
          {visibleNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground/65 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            type="button"
            onClick={openProfile}
            className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-primary-foreground shadow-sm">
              {avatar ? (
                <img src={avatar} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{currentUser.name}</div>
              <div className="truncate text-[11px] text-sidebar-foreground/55">
                {currentUser.role}
              </div>
            </div>
            <Settings className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
          </button>
        </div>
      </aside>

      {/* Profile settings dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleProfileSubmit}>
            <DialogHeader>
              <DialogTitle>Configurações do perfil</DialogTitle>
              <DialogDescription>Atualize sua foto, nome e senha.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  {profileForm.avatar ? (
                    <img
                      src={profileForm.avatar}
                      alt={profileForm.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-base font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Perfil</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    <span className="truncate">{currentEmployee?.role ?? currentUser.role}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Setor: {currentDepartment?.name ?? "Sem setor"}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome</span>
                <input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Foto</span>
                <div className="flex gap-2">
                  <input
                    value={profileForm.avatar}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        avatar: event.target.value,
                      }))
                    }
                    placeholder="URL da foto"
                    className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border hover:bg-muted">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              </label>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" />
                  Alterar senha
                </div>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    placeholder="Senha atual"
                    className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="Nova senha"
                    className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {profileError && <div className="text-xs text-destructive">{profileError}</div>}
            </div>

            <DialogFooter className="mt-5">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="h-9 flex-1 rounded-xl border border-border text-sm font-medium hover:bg-muted sm:flex-none sm:px-4"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:flex-none sm:px-4"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Save className="h-4 w-4" />
                {profileMutation.isPending ? "Salvando" : "Salvar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top relative border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3.5 md:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold text-foreground md:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="hidden h-9 w-64 items-center gap-2 rounded-xl border border-transparent bg-muted px-3 transition-colors focus-within:border-primary/40 focus-within:bg-background lg:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar tarefas, pessoas..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <NotificationsMenu tasks={data?.tasks ?? []} currentUserId={data?.currentUser.id} />
            {actions}
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted md:flex"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-full overflow-hidden transition-opacity duration-200",
              isFetching ? "opacity-100" : "opacity-0",
            )}
          >
            <div
              className="h-full w-1/3 animate-pulse"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
        </header>
        <div className="safe-x flex-1 animate-in fade-in slide-in-from-bottom-1 px-3 py-4 pb-24 duration-200 motion-reduce:animate-none md:px-6 md:py-6 md:pb-6">
          {children}
        </div>
      </main>

      <BottomTabBar
        primaryItems={primaryMobileNav}
        moreItems={moreMobileNav}
        pathname={pathname}
        userName={currentUser.name}
        userRole={currentUser.role}
        onOpenProfile={openProfile}
        onLogout={() => logoutMutation.mutate()}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
    in_progress: { label: "Em andamento", cls: "bg-primary/15 text-primary" },
    waiting_review: { label: "Aguardando revisão", cls: "bg-warning/20 text-warning-foreground" },
    reopened: { label: "Reaberta", cls: "bg-destructive/15 text-destructive" },
    completed: { label: "Concluída", cls: "bg-success/20 text-success" },
    canceled: { label: "Cancelada", cls: "bg-muted text-muted-foreground line-through" },
  } as const;
  const it = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
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
    medium: { label: "Média", cls: "bg-primary/15 text-primary" },
    high: { label: "Alta", cls: "bg-warning/20 text-warning-foreground" },
    urgent: { label: "Urgente", cls: "text-destructive-foreground" },
  } as const;
  const it = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        it.cls,
      )}
      style={
        priority === "urgent"
          ? { background: "linear-gradient(135deg, var(--destructive), oklch(0.68 0.2 15))" }
          : undefined
      }
    >
      {it.label}
    </span>
  );
}
