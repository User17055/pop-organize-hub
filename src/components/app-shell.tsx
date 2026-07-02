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
  Bell,
  Search,
  Settings,
  LogOut,
  Camera,
  KeyRound,
  Save,
  BriefcaseBusiness,
  Menu,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logout, updateProfile } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { Priority, TaskStatus } from "@/lib/domain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
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
    setMobileNavOpen(false);
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
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] md:hidden"
        />
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          "native-sidebar fixed md:sticky top-0 left-0 z-50 w-60 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out md:translate-x-0",
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold text-sm leading-tight truncate">
                Pop Organize
              </div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">{companyName}</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
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
                  "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium border-l-2 transition-colors",
                  active
                    ? "border-l-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-l-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2.5 border-t border-sidebar-border">
          <button
            type="button"
            onClick={openProfile}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent/40"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
              {avatar ? (
                <img src={avatar} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">
                {currentUser.role}
              </div>
            </div>
            <Settings className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
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
                    <div className="flex h-full w-full items-center justify-center text-base font-semibold text-primary-foreground bg-primary">
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
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
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
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-muted">
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

              <div className="rounded-md border border-border bg-muted/30 p-3">
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
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
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
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {profileError && <div className="text-xs text-destructive">{profileError}</div>}
            </div>

            <DialogFooter className="mt-5">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="h-9 flex-1 sm:flex-none sm:px-4 rounded-md border border-border text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="h-9 flex-1 sm:flex-none sm:px-4 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {profileMutation.isPending ? "Salvando" : "Salvar"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="safe-top relative bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 md:px-6 py-3.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5 text-foreground/70" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-display font-semibold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-md bg-muted border border-transparent focus-within:border-primary/40 focus-within:bg-background transition-colors w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar tarefas, pessoas..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <button className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
              <Bell className="h-4.5 w-4.5 text-foreground/70" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background" />
            </button>
            {actions}
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4 text-foreground/70" />
            </button>
          </div>
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-full overflow-hidden transition-opacity duration-200",
              isFetching ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="h-full w-1/3 bg-primary/70 animate-pulse" />
          </div>
        </header>
        <div className="safe-x safe-bottom flex-1 px-3 py-4 md:px-6 md:py-6 animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
          {children}
        </div>
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
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border border-transparent",
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
