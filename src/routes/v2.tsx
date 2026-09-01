import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns3,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sun,
  Table2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/data-state";
import { TaskCreateDrawer } from "@/components/tasks/task-create-drawer";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import {
  getDefaultDueDate,
  getDefaultRecurrence,
  recurrenceFromForm,
  type TaskFormState,
} from "@/components/tasks/task-form-types";
import { logout } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { PermissionKey, Priority, Task, TaskStatus } from "@/lib/domain";
import { priorityLabels } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { hasPermission, resolvePermissionSet, type PermissionSet } from "@/lib/permission-groups";
import "./v2.css";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Pop Organize V2" },
      { name: "description", content: "Novo painel operacional do Pop Organize." },
    ],
  }),
  component: PopOrganizeV2,
});

type Screen = "dashboard" | "board" | "calendar";
type View = "kanban" | "list" | "table";
type BoardStatus = "todo" | "doing" | "review" | "done";

const boardStatuses: Array<{
  id: BoardStatus;
  label: string;
  statuses: TaskStatus[];
  next: TaskStatus;
}> = [
  { id: "todo", label: "A fazer", statuses: ["pending", "reopened"], next: "pending" },
  { id: "doing", label: "Em andamento", statuses: ["in_progress"], next: "in_progress" },
  { id: "review", label: "Revisão / QA", statuses: ["waiting_review"], next: "waiting_review" },
  { id: "done", label: "Concluído", statuses: ["completed", "canceled"], next: "completed" },
];

const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function localIso(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function sameMonth(value: string, date: Date) {
  const parsed = new Date(`${value}T12:00:00`);
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth();
}

function PopOrganizeV2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [screen, setScreen] = useState<Screen>("board");
  const [view, setView] = useState<View>("kanban");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [responsible, setResponsible] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("pop-organize:v2-theme") as "dark" | "light") ?? "dark";
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(() => emptyForm(""));

  const mutations = useTaskMutations({
    onCreated: () => {
      setCreateOpen(false);
      toast.success("Tarefa criada no Pop Organize.");
    },
    onDeleted: () => {
      setSelectedId(null);
      toast.success("Tarefa excluída.");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/login" });
    },
  });

  useEffect(() => {
    localStorage.setItem("pop-organize:v2-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!error) return;
    const authError = error as Error & { statusCode?: number; status?: number };
    if (authError.statusCode === 401 || authError.status === 401) navigate({ to: "/login" });
  }, [error, navigate]);

  useEffect(() => {
    if (!data || departmentId === "all") return;
    if (!data.departments.some((department) => department.id === departmentId)) {
      setDepartmentId("all");
    }
  }, [data, departmentId]);

  const permissionSet = useMemo(
    () =>
      resolvePermissionSet({
        currentUser: data?.currentUser,
        employees: data?.employees ?? [],
        permissionGroups: data?.permissionGroups ?? [],
      }),
    [data],
  );
  const canCreateTask = hasPermission(permissionSet, "tasks.create");

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return data.tasks
      .filter((task) => {
        if (mine) {
          const ids = [task.responsibleId, ...(task.responsibleIds ?? [])];
          if (!ids.includes(data.currentUser.id) && task.target.id !== data.currentUser.id)
            return false;
        } else if (departmentId !== "all") {
          const employeeIds = new Set(
            data.employees
              .filter((employee) => employee.departmentId === departmentId)
              .map((employee) => employee.id),
          );
          const belongsToDepartment =
            (task.target.type === "department" && task.target.id === departmentId) ||
            employeeIds.has(task.responsibleId) ||
            (task.responsibleIds ?? []).some((id) => employeeIds.has(id));
          if (!belongsToDepartment) return false;
        }
        if (priority !== "all" && task.priority !== priority) return false;
        if (responsible !== "all") {
          const ids = [task.responsibleId, ...(task.responsibleIds ?? [])];
          if (!ids.includes(responsible)) return false;
        }
        if (
          normalized &&
          !`${task.title} ${task.description} ${task.tags.join(" ")} ${task.target.label}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [data, departmentId, mine, priority, responsible, search]);

  if (isLoading) return <V2Loading theme={theme} />;
  if (error || !data) {
    return (
      <div className="v2-auth-error">
        <ErrorState label="Não foi possível abrir o novo painel." />
      </div>
    );
  }

  const workspace = data;
  const currentDepartment = data.departments.find((item) => item.id === departmentId);
  const selectedTask = data.tasks.find((task) => task.id === selectedId) ?? null;
  const targetOptions =
    data.company.kind === "personal"
      ? [{ value: `user:${data.currentUser.id}`, label: "Somente eu" }]
      : [
          { value: `company:${data.company.id}`, label: "Empresa inteira" },
          ...data.departments.map((department) => ({
            value: `department:${department.id}`,
            label: `Setor: ${department.name}`,
          })),
          ...data.groups.map((group) => ({
            value: `group:${group.id}`,
            label: `Grupo: ${group.name}`,
          })),
          ...data.employees.map((employee) => ({
            value: `user:${employee.id}`,
            label: `Pessoa: ${employee.name}`,
          })),
        ];

  function openCreate(status?: BoardStatus) {
    const defaultTarget =
      departmentId !== "all"
        ? `department:${departmentId}`
        : workspace.company.kind === "personal"
          ? `user:${workspace.currentUser.id}`
          : `company:${workspace.company.id}`;
    setForm(emptyForm(defaultTarget));
    setCreateOpen(true);
    if (status && status !== "todo") {
      toast.info("A nova tarefa será criada como pendente; mova o card depois de salvar.");
    }
  }

  function submitCreate(nextForm: TaskFormState) {
    const [targetType, targetId] = nextForm.targetKey.split(":");
    mutations.createTaskMutation.mutate({
      title: nextForm.title,
      description: nextForm.description,
      priority: nextForm.priority,
      dueDate: nextForm.dueDate,
      target: { type: targetType as Task["target"]["type"], id: targetId },
      responsibleId: nextForm.responsibleId,
      reviewerId: nextForm.reviewerId || undefined,
      requiresReview: nextForm.requiresReview,
      tags: nextForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      checklist: nextForm.checklist
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(nextForm.recurrence),
    });
  }

  function moveTask(taskId: string, boardStatus: BoardStatus) {
    const task = workspace.tasks.find((item) => item.id === taskId);
    const target = boardStatuses.find((item) => item.id === boardStatus);
    if (!task || !target || target.statuses.includes(task.status)) return;
    const permissions = getTaskPermissions({
      task,
      currentUser: workspace.currentUser,
      employees: workspace.employees,
      departments: workspace.departments,
      groups: workspace.groups,
      permissionGroups: workspace.permissionGroups,
    });
    const allowed =
      target.next === "completed" ? permissions.canComplete : permissions.canChangeStatus;
    if (!allowed) {
      toast.error("Você não tem permissão para mover esta tarefa.");
      return;
    }
    mutations.statusMutation.mutate(
      { id: taskId, status: target.next },
      { onError: (mutationError) => toast.error(mutationError.message) },
    );
  }

  return (
    <div className="v2" data-v2-theme={theme}>
      <nav className="v2-rail" aria-label="Navegação principal">
        <button
          className="v2-mark"
          onClick={() => setScreen("dashboard")}
          aria-label="Pop Organize V2"
        >
          <span />
          <span />
          <span />
          <span />
        </button>
        <RailButton
          label="Painel"
          active={screen === "dashboard"}
          onClick={() => setScreen("dashboard")}
        >
          <LayoutDashboard />
        </RailButton>
        <RailButton label="Projetos" active={screen === "board"} onClick={() => setScreen("board")}>
          <FolderKanban />
        </RailButton>
        <RailButton
          label="Calendário"
          active={screen === "calendar"}
          onClick={() => setScreen("calendar")}
        >
          <CalendarDays />
        </RailButton>
        <div className="v2-rail-divider" />
        <RailLink
          to="/relatorios"
          label="Relatórios"
          permission="pages.reports"
          permissionSet={permissionSet}
        >
          <BarChart3 />
        </RailLink>
        <RailLink
          to="/funcionarios"
          label="Funcionários"
          permission="pages.employees"
          permissionSet={permissionSet}
        >
          <Users />
        </RailLink>
        <RailLink
          to="/empresas"
          label="Empresa"
          permission="pages.company"
          permissionSet={permissionSet}
        >
          <Building2 />
        </RailLink>
        <div className="v2-rail-space" />
        <RailLink
          to="/permissoes"
          label="Configurações"
          permission="manage.permissions"
          permissionSet={permissionSet}
        >
          <Settings />
        </RailLink>
        <RailButton label="Sair" danger onClick={() => logoutMutation.mutate()}>
          <LogOut />
        </RailButton>
      </nav>

      <aside
        className={`v2-sidebar ${sidebarOpen ? "" : "is-collapsed"} ${mobileSidebar ? "is-mobile-open" : ""}`}
      >
        <div className="v2-side-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar…"
          />
          <button onClick={() => setSidebarOpen(false)} aria-label="Recolher projetos">
            <ChevronLeft />
          </button>
        </div>
        <div className="v2-side-scroll">
          <button
            className={`v2-project-row v2-mine ${mine ? "is-active" : ""}`}
            onClick={() => {
              setMine(true);
              setDepartmentId("all");
              setScreen("board");
              setMobileSidebar(false);
            }}
          >
            <Circle />
            <span>Atribuído a mim</span>
            <b>
              {
                data.tasks.filter(
                  (task) =>
                    [task.responsibleId, ...(task.responsibleIds ?? [])].includes(
                      data.currentUser.id,
                    ) && task.status !== "completed",
                ).length
              }
            </b>
          </button>
          <div className="v2-project-group">
            <div className="v2-group-title">
              <ChevronDown /> Todos os projetos
            </div>
            <button
              className={`v2-project-row ${!mine && departmentId === "all" ? "is-active" : ""}`}
              onClick={() => {
                setMine(false);
                setDepartmentId("all");
                setScreen("board");
                setMobileSidebar(false);
              }}
            >
              <Circle />
              <span>Visão da empresa</span>
            </button>
            {data.departments.map((department) => (
              <div className="v2-project" key={department.id}>
                <button
                  className={`v2-project-row ${!mine && departmentId === department.id ? "is-active" : ""}`}
                  onClick={() => {
                    setMine(false);
                    setDepartmentId(department.id);
                    setScreen("board");
                    setMobileSidebar(false);
                  }}
                >
                  <Circle style={{ color: department.color }} />
                  <span>{department.name}</span>
                </button>
                {!mine && departmentId === department.id && (
                  <div className="v2-project-sections">
                    <button className="is-active">
                      <Circle /> Visão geral
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {canCreateTask && (
          <button className="v2-side-new" onClick={() => openCreate()}>
            <Plus /> Nova tarefa
          </button>
        )}
      </aside>

      <main className="v2-main">
        <header className="v2-header">
          <button className="v2-mobile-menu" onClick={() => setMobileSidebar(true)}>
            <Menu />
          </button>
          {!sidebarOpen && (
            <button className="v2-expand-side" onClick={() => setSidebarOpen(true)}>
              <ChevronRight />
            </button>
          )}
          <div className="v2-heading">
            <h1>
              {screen === "dashboard"
                ? "Painel"
                : screen === "calendar"
                  ? "Calendário"
                  : mine
                    ? "Atribuído a mim"
                    : (currentDepartment?.name ?? data.company.name)}
            </h1>
            <p>{screen === "board" ? "Visão geral" : data.company.name}</p>
          </div>
          <div className="v2-header-actions">
            <div className="v2-theme-switch">
              <button
                className={theme === "dark" ? "is-active" : ""}
                onClick={() => setTheme("dark")}
              >
                <Moon />
              </button>
              <button
                className={theme === "light" ? "is-active" : ""}
                onClick={() => setTheme("light")}
              >
                <Sun />
              </button>
            </div>
            <button className="v2-icon-button">
              <Bell />
              <i>
                {
                  filteredTasks.filter(
                    (task) => task.status !== "completed" && task.dueDate <= localIso(),
                  ).length
                }
              </i>
            </button>
            <span className="v2-avatar">
              {initials(data.currentUser.name)}
              <i />
            </span>
          </div>
        </header>

        {screen === "dashboard" && (
          <Dashboard
            data={data}
            tasks={filteredTasks}
            setScreen={setScreen}
            setSelectedId={setSelectedId}
          />
        )}
        {screen === "board" && (
          <Board
            tasks={filteredTasks}
            data={data}
            view={view}
            setView={setView}
            priority={priority}
            setPriority={setPriority}
            responsible={responsible}
            setResponsible={setResponsible}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            canCreate={canCreateTask}
            openCreate={openCreate}
            setSelectedId={setSelectedId}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            moveTask={moveTask}
          />
        )}
        {screen === "calendar" && (
          <CalendarView
            tasks={filteredTasks}
            date={calendarDate}
            setDate={setCalendarDate}
            setSelectedId={setSelectedId}
          />
        )}
      </main>

      {mobileSidebar && (
        <button
          className="v2-mobile-scrim"
          onClick={() => setMobileSidebar(false)}
          aria-label="Fechar menu"
        >
          <X />
        </button>
      )}

      <TaskCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        onSubmit={submitCreate}
        isSubmitting={mutations.createTaskMutation.isPending}
        errorMessage={mutations.createTaskMutation.error?.message}
        employees={data.employees}
        targetOptions={targetOptions}
        personalMode={data.company.kind === "personal"}
        canCreateChecklist={hasPermission(permissionSet, "tasks.checklist")}
      />

      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          data={data}
          onClose={() => setSelectedId(null)}
          mutations={mutations}
        />
      )}
    </div>
  );
}

function emptyForm(targetKey: string): TaskFormState {
  const dueDate = getDefaultDueDate();
  return {
    title: "",
    description: "",
    priority: "medium",
    dueDate,
    targetKey,
    responsibleId: "",
    reviewerId: "",
    requiresReview: false,
    tags: "",
    checklist: "",
    recurrence: getDefaultRecurrence(dueDate),
  };
}

function RailButton({
  children,
  label,
  active,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`v2-rail-button ${active ? "is-active" : ""} ${danger ? "is-danger" : ""}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function RailLink({
  children,
  to,
  label,
  permission,
  permissionSet,
}: {
  children: React.ReactNode;
  to: string;
  label: string;
  permission: PermissionKey;
  permissionSet: PermissionSet;
}) {
  if (!hasPermission(permissionSet, permission)) return null;
  return (
    <Link className="v2-rail-button" to={to} title={label} aria-label={label}>
      {children}
    </Link>
  );
}

function V2Loading({ theme }: { theme: "dark" | "light" }) {
  return (
    <div className="v2 v2-loading" data-v2-theme={theme}>
      <span />
      <p>Preparando seu novo painel…</p>
    </div>
  );
}

type Workspace = NonNullable<ReturnType<typeof useWorkspaceData>["data"]>;

function Board({
  tasks,
  data,
  view,
  setView,
  priority,
  setPriority,
  responsible,
  setResponsible,
  showFilters,
  setShowFilters,
  canCreate,
  openCreate,
  setSelectedId,
  draggingId,
  setDraggingId,
  moveTask,
}: {
  tasks: Task[];
  data: Workspace;
  view: View;
  setView: (view: View) => void;
  priority: Priority | "all";
  setPriority: (priority: Priority | "all") => void;
  responsible: string;
  setResponsible: (id: string) => void;
  showFilters: boolean;
  setShowFilters: (open: boolean) => void;
  canCreate: boolean;
  openCreate: (status?: BoardStatus) => void;
  setSelectedId: (id: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  moveTask: (id: string, status: BoardStatus) => void;
}) {
  const activeFilters = Number(priority !== "all") + Number(responsible !== "all");
  return (
    <div className="v2-content">
      <section className="v2-brief">
        <div>
          <span>Setor como projeto</span>
          <h2>
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"} nesta visão
          </h2>
        </div>
        <p>Os dados, responsáveis, prazos e permissões são os mesmos do Pop Organize atual.</p>
      </section>
      <div className="v2-toolbar">
        <div className="v2-segmented">
          <button
            className={view === "kanban" ? "is-active" : ""}
            onClick={() => setView("kanban")}
          >
            <Columns3 /> Kanban
          </button>
          <button className={view === "list" ? "is-active" : ""} onClick={() => setView("list")}>
            <List /> Lista
          </button>
          <button className={view === "table" ? "is-active" : ""} onClick={() => setView("table")}>
            <Table2 /> Tabela
          </button>
        </div>
        <div className="v2-filter-wrap">
          <button className="v2-button" onClick={() => setShowFilters(!showFilters)}>
            Filtros {activeFilters > 0 && <b>{activeFilters}</b>}
          </button>
          {showFilters && (
            <div className="v2-filter-popover">
              <label>
                Prioridade
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority | "all")}
                >
                  <option value="all">Todas</option>
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>
              <label>
                Responsável
                <select
                  value={responsible}
                  onChange={(event) => setResponsible(event.target.value)}
                >
                  <option value="all">Todas as pessoas</option>
                  {data.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  setPriority("all");
                  setResponsible("all");
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
        {canCreate && (
          <button className="v2-button v2-primary" onClick={() => openCreate()}>
            <Plus /> Nova tarefa
          </button>
        )}
      </div>

      {view === "kanban" ? (
        <div className="v2-kanban">
          {boardStatuses.map((status) => {
            const items = tasks.filter((task) => status.statuses.includes(task.status));
            return (
              <section
                className={`v2-column status-${status.id} ${draggingId ? "is-dragging" : ""}`}
                key={status.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingId) moveTask(draggingId, status.id);
                  setDraggingId(null);
                }}
              >
                <header>
                  <h3>{status.label}</h3>
                  <span>{items.length}</span>
                  <button onClick={() => openCreate(status.id)}>
                    <Plus />
                  </button>
                </header>
                <div className="v2-card-list">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      data={data}
                      onOpen={() => setSelectedId(task.id)}
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="v2-column-empty">Solte uma tarefa aqui</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : view === "list" ? (
        <div className="v2-list-view">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} data={data} onOpen={() => setSelectedId(task.id)} />
          ))}
        </div>
      ) : (
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Responsável</th>
                <th>Destino</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskTableRow
                  key={task.id}
                  task={task}
                  data={data}
                  onOpen={() => setSelectedId(task.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tasks.length === 0 && (
        <div className="v2-empty">
          <FolderKanban />
          <h3>Nenhuma tarefa por aqui</h3>
          <p>Ajuste os filtros ou crie a primeira tarefa deste setor.</p>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  data,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  data: Workspace;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const employee = data.employees.find((item) => item.id === task.responsibleId);
  const overdue = task.status !== "completed" && task.dueDate < localIso();
  return (
    <article
      className="v2-task-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="v2-card-top">
        <span className={`v2-priority priority-${task.priority}`}>
          {priorityLabels[task.priority]}
        </span>
        <MoreHorizontal />
      </div>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      <div className="v2-tags">
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <footer>
        <div className="v2-card-meta">
          <span>
            <Paperclip />
            {task.attachments}
          </span>
          <span>
            <MessageSquare />
            {task.comments}
          </span>
        </div>
        <span className={`v2-due ${overdue ? "is-overdue" : ""}`}>{formatDate(task.dueDate)}</span>
        <span className="v2-mini-avatar" title={employee?.name}>
          {initials(employee?.name ?? "Sem responsável")}
        </span>
      </footer>
    </article>
  );
}

function TaskRow({ task, data, onOpen }: { task: Task; data: Workspace; onOpen: () => void }) {
  const status = boardStatuses.find((item) => item.statuses.includes(task.status));
  const employee = data.employees.find((item) => item.id === task.responsibleId);
  return (
    <button className="v2-task-row" onClick={onOpen}>
      <i className={`status-${status?.id ?? "todo"}`} />
      <div>
        <b>{task.title}</b>
        <span>{task.target.label}</span>
      </div>
      <span className={`v2-priority priority-${task.priority}`}>
        {priorityLabels[task.priority]}
      </span>
      <span className="v2-row-person">{employee?.name ?? "Sem responsável"}</span>
      <time>{formatDate(task.dueDate)}</time>
      <ChevronRight />
    </button>
  );
}

function TaskTableRow({ task, data, onOpen }: { task: Task; data: Workspace; onOpen: () => void }) {
  const status = boardStatuses.find((item) => item.statuses.includes(task.status));
  const employee = data.employees.find((item) => item.id === task.responsibleId);
  return (
    <tr onClick={onOpen}>
      <td>
        <b>{task.title}</b>
        <small>{task.description}</small>
      </td>
      <td>
        <span className={`v2-status status-${status?.id ?? "todo"}`}>{status?.label}</span>
      </td>
      <td>{priorityLabels[task.priority]}</td>
      <td>{employee?.name ?? "—"}</td>
      <td>{task.target.label}</td>
      <td>{formatDate(task.dueDate)}</td>
    </tr>
  );
}

function Dashboard({
  data,
  tasks,
  setScreen,
  setSelectedId,
}: {
  data: Workspace;
  tasks: Task[];
  setScreen: (screen: Screen) => void;
  setSelectedId: (id: string) => void;
}) {
  const today = localIso();
  const open = tasks.filter((task) => task.status !== "completed" && task.status !== "canceled");
  const todayTasks = open.filter((task) => task.dueDate === today);
  const overdue = open.filter((task) => task.dueDate < today);
  const completed = tasks.filter((task) => task.status === "completed");
  const completion = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  return (
    <div className="v2-content v2-dashboard">
      <div className="v2-dashboard-title">
        <div>
          <h2>Olá, {data.currentUser.name.split(" ")[0]}</h2>
          <p>Aqui está o ritmo da sua operação hoje.</p>
        </div>
        <button className="v2-button v2-primary" onClick={() => setScreen("board")}>
          Abrir projetos <ChevronRight />
        </button>
      </div>
      <div className="v2-metrics">
        <Metric
          label="Tarefas abertas"
          value={open.length}
          detail={`${todayTasks.length} para hoje`}
          tone="blue"
        />
        <Metric label="Atrasadas" value={overdue.length} detail="Precisam de atenção" tone="red" />
        <Metric
          label="Concluídas"
          value={completed.length}
          detail={`${completion}% do total`}
          tone="green"
        />
        <Metric
          label="Setores / projetos"
          value={data.departments.length}
          detail={`${data.employees.length} pessoas`}
          tone="yellow"
        />
      </div>
      <div className="v2-dashboard-grid">
        <section className="v2-panel v2-today-panel">
          <header>
            <div>
              <span>Prioridades</span>
              <h3>Tarefas de hoje</h3>
            </div>
            <button onClick={() => setScreen("board")}>Ver quadro</button>
          </header>
          {todayTasks.length ? (
            todayTasks
              .slice(0, 6)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  data={data}
                  onOpen={() => setSelectedId(task.id)}
                />
              ))
          ) : (
            <div className="v2-panel-empty">
              <Check /> Nenhuma entrega vence hoje.
            </div>
          )}
        </section>
        <section className="v2-panel">
          <header>
            <div>
              <span>Fluxo</span>
              <h3>Status das tarefas</h3>
            </div>
          </header>
          <div className="v2-status-chart">
            {boardStatuses.map((status) => {
              const count = tasks.filter((task) => status.statuses.includes(task.status)).length;
              const pct = tasks.length ? (count / tasks.length) * 100 : 0;
              return (
                <div key={status.id}>
                  <label>
                    <span className={`status-${status.id}`} />
                    {status.label}
                    <b>{count}</b>
                  </label>
                  <i>
                    <span className={`status-${status.id}`} style={{ width: `${pct}%` }} />
                  </i>
                </div>
              );
            })}
          </div>
        </section>
        <section className="v2-panel v2-project-progress">
          <header>
            <div>
              <span>Projetos</span>
              <h3>Progresso por setor</h3>
            </div>
          </header>
          {data.departments.slice(0, 6).map((department) => {
            const ids = new Set(
              data.employees
                .filter((employee) => employee.departmentId === department.id)
                .map((employee) => employee.id),
            );
            const all = tasks.filter(
              (task) =>
                (task.target.type === "department" && task.target.id === department.id) ||
                ids.has(task.responsibleId),
            );
            const done = all.filter((task) => task.status === "completed").length;
            const pct = all.length ? Math.round((done / all.length) * 100) : 0;
            return (
              <div key={department.id}>
                <label>
                  <span style={{ background: department.color }} />
                  {department.name}
                  <b>{pct}%</b>
                </label>
                <i>
                  <span style={{ width: `${pct}%`, background: department.color }} />
                </i>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <section className={`v2-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}

function CalendarView({
  tasks,
  date,
  setDate,
  setSelectedId,
}: {
  tasks: Task[];
  date: Date;
  setDate: (date: Date) => void;
  setSelectedId: (id: string) => void;
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  function changeMonth(delta: number) {
    setDate(new Date(date.getFullYear(), date.getMonth() + delta, 1));
  }
  return (
    <div className="v2-content v2-calendar">
      <div className="v2-calendar-toolbar">
        <div>
          <h2>{title}</h2>
          <p>
            {tasks.filter((task) => sameMonth(task.dueDate, date)).length} tarefas com prazo neste
            mês
          </p>
        </div>
        <div>
          <button onClick={() => changeMonth(-1)}>
            <ChevronLeft />
          </button>
          <button onClick={() => setDate(new Date())}>Hoje</button>
          <button onClick={() => changeMonth(1)}>
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="v2-calendar-grid">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
          <b className="v2-weekday" key={label}>
            {label}
          </b>
        ))}
        {days.map((day) => {
          const iso = localIso(day);
          const items = tasks.filter((task) => task.dueDate === iso);
          return (
            <div
              className={`v2-day ${day.getMonth() !== date.getMonth() ? "is-outside" : ""} ${iso === localIso() ? "is-today" : ""}`}
              key={iso}
            >
              <time>{day.getDate()}</time>
              <div>
                {items.slice(0, 4).map((task) => {
                  const status = boardStatuses.find((item) => item.statuses.includes(task.status));
                  return (
                    <button
                      className={`status-${status?.id ?? "todo"}`}
                      key={task.id}
                      onClick={() => setSelectedId(task.id)}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {items.length > 4 && <span>+ {items.length - 4} tarefas</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskPanel({
  task,
  data,
  onClose,
  mutations,
}: {
  task: Task;
  data: Workspace;
  onClose: () => void;
  mutations: ReturnType<typeof useTaskMutations>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [responsibleId, setResponsibleId] = useState(task.responsibleId);
  const [tags, setTags] = useState(task.tags.join(", "));
  const [comment, setComment] = useState("");
  const permissions = getTaskPermissions({
    task,
    currentUser: data.currentUser,
    employees: data.employees,
    departments: data.departments,
    groups: data.groups,
    permissionGroups: data.permissionGroups,
  });
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setResponsibleId(task.responsibleId);
    setTags(task.tags.join(", "));
  }, [task]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!permissions.canEditContent) return;
    mutations.updateTaskMutation.mutate({
      id: task.id,
      title,
      description,
      priority,
      dueDate,
      target: { type: task.target.type, id: task.target.id },
      responsibleId,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: task.recurrence,
    });
  }
  return (
    <div
      className="v2-modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="v2-task-panel" onSubmit={submit}>
        <header>
          <div>
            <span>{permissions.roleLabel}</span>
            <h2>Detalhes da tarefa</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="v2-task-panel-body">
          <label>
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!permissions.canEditContent}
            />
          </label>
          <label>
            Descrição
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!permissions.canEditContent}
            />
          </label>
          <div className="v2-form-grid">
            <label>
              Status
              <select
                value={task.status}
                onChange={(event) =>
                  mutations.statusMutation.mutate({
                    id: task.id,
                    status: event.target.value as TaskStatus,
                  })
                }
                disabled={!permissions.canChangeStatus}
              >
                <option value="pending">Pendente</option>
                <option value="in_progress">Em andamento</option>
                <option value="waiting_review">Aguardando revisão</option>
                <option value="completed">Concluída</option>
                <option value="canceled">Cancelada</option>
                <option value="reopened">Reaberta</option>
              </select>
            </label>
            <label>
              Prioridade
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                disabled={!permissions.canEditContent}
              >
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={!permissions.canEditContent}
              />
            </label>
            <label>
              Responsável
              <select
                value={responsibleId}
                onChange={(event) => setResponsibleId(event.target.value)}
                disabled={!permissions.canAssign}
              >
                <option value="">Sem responsável</option>
                {data.employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Etiquetas
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              disabled={!permissions.canEditContent}
              placeholder="separadas por vírgula"
            />
          </label>
          <div className="v2-task-info">
            <span>
              Destino <b>{task.target.label}</b>
            </span>
            <span>
              <MessageSquare /> {task.comments} comentários
            </span>
            <span>
              <Paperclip /> {task.attachments} anexos
            </span>
          </div>
          {permissions.canComment && (
            <div className="v2-comment-box">
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Escreva um comentário…"
              />
              <button
                type="button"
                onClick={() => {
                  if (!comment.trim()) return;
                  mutations.commentMutation.mutate(
                    { taskId: task.id, body: comment.trim() },
                    { onSuccess: () => setComment("") },
                  );
                }}
              >
                Enviar
              </button>
            </div>
          )}
          {mutations.updateTaskMutation.error && (
            <p className="v2-form-error">{mutations.updateTaskMutation.error.message}</p>
          )}
        </div>
        <footer>
          {permissions.canDelete && (
            <button
              type="button"
              className="v2-delete"
              onClick={() => {
                if (window.confirm("Excluir esta tarefa permanentemente?"))
                  mutations.deleteTaskMutation.mutate({ id: task.id });
              }}
            >
              <Trash2 /> Excluir
            </button>
          )}
          <span />
          <button type="button" className="v2-button" onClick={onClose}>
            Fechar
          </button>
          {permissions.canEditContent && (
            <button
              className="v2-button v2-primary"
              disabled={mutations.updateTaskMutation.isPending}
            >
              Salvar alterações
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
