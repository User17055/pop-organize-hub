import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
  ShieldCheck,
  Menu,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { logout, updateProfile } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { getAvatarGradient } from "@/lib/avatar-colors";
import type { PermissionKey, Priority, TaskStatus } from "@/lib/domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
import { useTaskAlerts } from "@/hooks/use-task-alerts";
import { NotificationsMenu } from "@/components/notifications-menu";
import { BottomTabBar, type NavItem } from "@/components/bottom-tab-bar";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NavVisibility = "all" | "admin" | PermissionKey;

const nav: Array<NavItem & { visibility: NavVisibility }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, visibility: "all" },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare, visibility: "all" },
  { to: "/calendario", label: "Calendário", icon: CalendarDays, visibility: "all" },
  { to: "/grupos", label: "Grupos", icon: FolderKanban, visibility: "all" },
  { to: "/setores", label: "Setores", icon: Layers, visibility: "pages.departments" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, visibility: "pages.reports" },
  { to: "/funcionarios", label: "Funcionários", icon: Users, visibility: "pages.employees" },
  { to: "/empresas", label: "Empresas", icon: Building2, visibility: "pages.company" },
  { to: "/permissoes", label: "Permissões", icon: ShieldCheck, visibility: "admin" },
];

const SIDEBAR_COLLAPSED_KEY = "pop-organize:sidebar-collapsed";
const THEME_KEY = "pop-organize:theme";

type ScrollEdge = "top" | "bottom" | null;

function isAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const typedError = error as Error & { statusCode?: number; status?: number };
  return (
    typedError.statusCode === 401 || typedError.status === 401 || error.message.includes("Sess")
  );
}

function getScrollableElement(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const canScroll =
      /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    if (canScroll) return node as HTMLElement;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

function isAtScrollEdge(element: HTMLElement, edge: Exclude<ScrollEdge, null>) {
  const top = element.scrollTop;
  const max = element.scrollHeight - element.clientHeight;
  return edge === "top" ? top <= 1 : top >= max - 1;
}

function ScrollBoundaryEffect() {
  const [edge, setEdge] = useState<ScrollEdge>(null);
  const startYRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function flash(nextEdge: Exclude<ScrollEdge, null>) {
      setEdge(nextEdge);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setEdge(null), 420);
    }

    function handleTouchStart(event: TouchEvent) {
      startYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      const startY = startYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (startY == null || currentY == null) return;
      const delta = currentY - startY;
      const scrollable = getScrollableElement(event.target);
      if (!scrollable || Math.abs(delta) < 10) return;
      if (delta > 0 && isAtScrollEdge(scrollable, "top")) flash("top");
      if (delta < 0 && isAtScrollEdge(scrollable, "bottom")) flash("bottom");
    }

    function handleWheel(event: WheelEvent) {
      const scrollable = getScrollableElement(event.target);
      if (!scrollable) return;
      if (event.deltaY < -8 && isAtScrollEdge(scrollable, "top")) flash("top");
      if (event.deltaY > 8 && isAtScrollEdge(scrollable, "bottom")) flash("bottom");
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("wheel", handleWheel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {edge && (
        <motion.div
          key={edge}
          initial={{ opacity: 0, scaleY: 0.75 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.92 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-none fixed left-0 right-0 z-[80] md:hidden",
            edge === "top" ? "top-0 origin-top" : "bottom-0 origin-bottom",
          )}
          style={{
            height: edge === "top" ? "7rem" : "8.5rem",
            background:
              edge === "top"
                ? "radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 28%, transparent), transparent 68%)"
                : "radial-gradient(ellipse at bottom, color-mix(in oklab, var(--primary) 24%, transparent), transparent 70%)",
            filter: "blur(0.5px)",
          }}
        />
      )}
    </AnimatePresence>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  contentClassName,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  contentClassName?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, error } = useWorkspaceData();
  const currentUser = data?.currentUser;
  const currentEmployee = data?.employees.find((employee) => employee.id === currentUser?.id);
  const currentDepartment = data?.departments.find(
    (department) => department.id === currentEmployee?.departmentId,
  );
  const avatar = currentEmployee?.avatar;
  const initials = (currentUser?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const permissionSet = resolvePermissionSet({
    currentUser,
    employees: data?.employees ?? [],
    permissionGroups: data?.permissionGroups ?? [],
  });
  const isAdmin = isAdminUser({ currentUser, employees: data?.employees ?? [] });
  const visibleNav = nav.filter((item) => {
    if (item.visibility === "all") return true;
    if (item.visibility === "admin") return isAdmin;
    return hasPermission(permissionSet, item.visibility);
  });
  const primaryMobileNav = visibleNav.filter((item) =>
    ["/", "/tarefas", "/calendario"].includes(item.to),
  );
  const moreMobileNav = visibleNav.filter((item) => !primaryMobileNav.includes(item));
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    if (error && isAuthError(error) && pathname !== "/login") {
      queryClient.removeQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/login" });
    }
  }, [error, navigate, pathname, queryClient]);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#15171d" : "#f7f8fb");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // O tema continua ativo durante a sessão quando o armazenamento não está disponível.
    }
  }, [theme]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // storage indisponível — estado só não persiste
      }
      return next;
    });
  }

  useTaskAlerts(data?.tasks, data?.currentUser.id);
  const [profileForm, setProfileForm] = useState({
    name: currentEmployee?.name ?? currentUser?.name ?? "",
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
      name: currentEmployee?.name ?? currentUser?.name ?? "",
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

  if (!data || !currentUser) {
    return (
      <div className="native-viewport flex w-full bg-background">
        <main className="app-main-shell flex min-w-0 flex-1 flex-col">
          <header className="glass-header safe-top sticky top-0 z-30 border-b border-white/70">
            <div className="relative flex items-center gap-3 px-4 py-3 md:px-10 md:py-3.5 lg:px-12">
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-[22px] font-bold leading-tight text-foreground md:text-xl md:font-semibold">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions}
            </div>
          </header>
          <div className={cn("flex-1 px-4 py-7 md:px-10 lg:px-12", contentClassName)}>
            {children}
          </div>
        </main>
        <Toaster position="top-center" closeButton richColors />
      </div>
    );
  }

  return (
    <div className="native-viewport flex w-full bg-background">
      {/* Sidebar (desktop/tablet only) */}
      <aside
        className={cn(
          "glass-sidebar native-sidebar sticky top-0 hidden h-screen flex-col border-r border-white/70 text-sidebar-foreground soft-transition transition-[width,background-color] duration-300 md:flex",
          collapsed ? "w-[84px]" : "w-72",
        )}
      >
        <div
          className={cn(
            "flex items-center py-5",
            collapsed ? "flex-col gap-3 px-3" : "justify-between px-5",
          )}
        >
          {!collapsed && (
            <Link to="/" className="flex items-center overflow-hidden" aria-label="Pop Organize">
              <span className="truncate font-display text-base font-bold text-sidebar-foreground">
                Pop Organize
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="glass-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/70 hover:text-primary"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav
          className={cn("flex-1 space-y-1.5 overflow-y-auto py-2", collapsed ? "px-3.5" : "px-5")}
          style={{ overscrollBehavior: "contain" }}
        >
          {visibleNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-2xl text-sm font-medium soft-transition transition-all duration-300",
                  collapsed ? "justify-center px-0 py-3" : "gap-3.5 px-4 py-2.5",
                  active
                    ? "text-primary-foreground"
                    : cn(
                        "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        !collapsed && "hover:translate-x-0.5",
                      ),
                )}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("space-y-1.5 py-4", collapsed ? "px-3.5" : "px-5")}>
          <button
            type="button"
            onClick={openProfile}
            title={collapsed ? currentUser.name : undefined}
            className={cn(
              "flex w-full items-center rounded-2xl text-left soft-transition transition-colors hover:bg-sidebar-accent",
              collapsed ? "justify-center p-2" : "gap-3 p-2.5",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-primary-foreground">
              {avatar ? (
                <img src={avatar} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: getAvatarGradient(currentUser.id) }}
                >
                  {initials}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{currentUser.name}</div>
                  <div className="truncate text-[11px] text-sidebar-foreground/55">
                    {currentUser.role}
                  </div>
                </div>
                <Settings className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
              </>
            )}
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
                      style={{ background: getAvatarGradient(currentUser.id) }}
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

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-foreground">Aparência</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Escolha como o aplicativo aparece para você.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition active:scale-[0.98]",
                      theme === "light"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Sun className="h-4 w-4" /> Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition active:scale-[0.98]",
                      theme === "dark"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Moon className="h-4 w-4" /> Escuro
                  </button>
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

      {/* Mobile fixed header */}
      <header className="mobile-fixed-header glass-header safe-top fixed left-0 right-0 top-0 z-[70] border-b border-white/70 md:hidden">
        <div className="relative mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] font-bold leading-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationsMenu tasks={data?.tasks ?? []} currentUserId={data?.currentUser.id} />
            {actions}
            {data.accessMode === "personal" ? (
              <Link
                to="/login"
                className="glass-icon-button flex h-9 w-9 items-center justify-center rounded-xl text-foreground/70"
                aria-label="Entrar"
                title="Entrar"
              >
                <UserRound className="h-[18px] w-[18px]" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={openProfile}
                className="glass-icon-button flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-primary-foreground"
                aria-label="Abrir perfil"
                title="Perfil"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: getAvatarGradient(currentUser.id) }}
                  >
                    {initials}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="app-main-shell flex min-w-0 flex-1 flex-col">
        <header className="glass-header safe-top sticky top-0 z-30 hidden border-b border-white/70 md:block">
          <div className="relative mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 md:px-10 md:py-3.5 lg:px-12">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[22px] font-bold leading-tight text-foreground md:text-xl md:font-semibold">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="glass-surface hidden h-9 w-64 items-center gap-2 rounded-xl border border-white/70 bg-white/50 px-3 soft-transition transition-colors focus-within:border-primary/40 focus-within:bg-white/85 lg:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar tarefas, pessoas..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <NotificationsMenu tasks={data?.tasks ?? []} currentUserId={data?.currentUser.id} />
              {actions}
              {data.accessMode === "personal" ? (
                <Link
                  to="/login"
                  className="glass-surface hidden h-9 items-center gap-2 rounded-xl border border-white/70 bg-white/50 px-3 text-sm font-medium text-foreground/75 transition hover:text-primary md:inline-flex"
                >
                  <UserRound className="h-4 w-4" />
                  Entrar
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openProfile}
                  className="glass-icon-button hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-primary-foreground md:flex"
                  title="Abrir perfil"
                  aria-label="Abrir perfil"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: getAvatarGradient(currentUser.id) }}
                    >
                      {initials}
                    </span>
                  )}
                </button>
              )}
              {data.accessMode === "team" && (
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="glass-icon-button hidden h-9 w-9 items-center justify-center rounded-xl text-foreground/70 md:flex"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "app-scroll-content mx-auto w-full max-w-[1440px] flex-1 px-4 pb-32 pt-[calc(var(--safe-area-top)+5.25rem)] md:px-10 md:py-7 md:pb-7 lg:px-12",
              contentClassName,
            )}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabBar
        primaryItems={primaryMobileNav}
        moreItems={moreMobileNav}
        pathname={pathname}
        userName={currentUser.name}
        userRole={currentUser.role}
        onOpenProfile={openProfile}
        onLogout={() => logoutMutation.mutate()}
        showLogout={data.accessMode === "team"}
      />

      <Toaster position="top-center" closeButton richColors />
      <ScrollBoundaryEffect />
    </div>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    pending: { label: "Pendente", cls: "bg-slate-500/10 text-slate-600" },
    in_progress: { label: "Em andamento", cls: "bg-primary/14 text-primary" },
    waiting_review: { label: "Aguardando revisão", cls: "bg-warning/22 text-warning-foreground" },
    reopened: { label: "Reaberta", cls: "bg-destructive/14 text-destructive" },
    completed: { label: "Concluída", cls: "bg-success/18 text-success" },
    canceled: { label: "Cancelada", cls: "bg-muted text-muted-foreground line-through" },
  } as const;
  const it = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
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
    low: { label: "Baixa", cls: "bg-slate-500/10 text-slate-600" },
    medium: { label: "Média", cls: "bg-primary/14 text-primary" },
    high: { label: "Alta", cls: "bg-warning/22 text-warning-foreground" },
    urgent: { label: "Urgente", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const it = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        it.cls,
      )}
    >
      {it.label}
    </span>
  );
}
