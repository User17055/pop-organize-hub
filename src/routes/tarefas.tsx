import { createFileRoute } from "@tanstack/react-router";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { PENDING_TASK_KEY } from "@/components/notifications-menu";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import type { PermissionKey, TargetType, Task, TaskStatus, WorkspaceData } from "@/lib/domain";
import { unassignedResponsibleLabel } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Columns3,
  Layers3,
  Network,
  Plus,
  Repeat,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCreateDrawer } from "@/components/tasks/task-create-drawer";
import { openPopAssistant } from "@/components/pop-launcher";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskList } from "@/components/tasks/task-list";
import { RecurringDeleteDialog } from "@/components/tasks/recurring-delete-dialog";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import { emptyTaskFilters, taskMatchesFilters } from "@/components/tasks/task-filter-bar";
import { PriorityBadge } from "@/components/app-shell";
import {
  getDefaultDueDate,
  getDefaultRecurrence,
  recurrenceFromForm,
  recurrenceLabel,
  recurrenceToForm,
  formatFileSizeMb,
  type TaskEditState,
  type TaskFormState,
} from "@/components/tasks/task-form-types";

type TasksSearch = {
  lista?: string;
  status?: TaskStatus | "all";
  escopo?: "today" | "overdue" | "upcoming" | "mine" | "department" | "group" | "all";
  setor?: string;
  colaborador?: string;
  grupo?: string;
};

export const Route = createFileRoute("/tarefas")({
  validateSearch: (search: Record<string, unknown>): TasksSearch => ({
    lista:
      typeof search.lista === "string" && search.lista.trim() ? search.lista.trim() : undefined,
    status: isTaskStatusFilter(search.status) ? search.status : undefined,
    escopo: isTaskScope(search.escopo) ? search.escopo : undefined,
    setor:
      typeof search.setor === "string" && search.setor.trim() ? search.setor.trim() : undefined,
    colaborador:
      typeof search.colaborador === "string" && search.colaborador.trim()
        ? search.colaborador.trim()
        : undefined,
    grupo:
      typeof search.grupo === "string" && search.grupo.trim() ? search.grupo.trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tarefas - Pop Organize" },
      { name: "description", content: "Gerencie, filtre e acompanhe todas as tarefas da empresa." },
    ],
  }),
  component: TasksPage,
});

const statusFilters: Array<{ key: TaskStatus | "all"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "in_progress", label: "Em andamento" },
  { key: "waiting_review", label: "Aguardando revisão" },
  { key: "reopened", label: "Reabertas" },
  { key: "completed", label: "Concluídas" },
  { key: "canceled", label: "Canceladas" },
];

type TaskScope = NonNullable<TasksSearch["escopo"]>;

const adminScopeFilters: Array<{ key: TaskScope; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "overdue", label: "Atrasadas" },
  { key: "upcoming", label: "Próximas" },
  { key: "mine", label: "Para mim" },
  { key: "department", label: "Setor" },
  { key: "group", label: "Grupo" },
  { key: "all", label: "Todas" },
];

const taskStatusFilterKeys = new Set(statusFilters.map((filter) => filter.key));
const taskScopeKeys = new Set(adminScopeFilters.map((filter) => filter.key));

function isTaskStatusFilter(value: unknown): value is TaskStatus | "all" {
  return typeof value === "string" && taskStatusFilterKeys.has(value as TaskStatus | "all");
}

function isTaskScope(value: unknown): value is TaskScope {
  return typeof value === "string" && taskScopeKeys.has(value as TaskScope);
}

function taskMatchesAdminScope(task: Task, scope: TaskScope, data: WorkspaceData) {
  if (scope === "all") return true;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  if (scope === "today") return task.status !== "completed" && task.dueDate === today;
  if (scope === "overdue") return task.status !== "completed" && task.dueDate < today;
  if (scope === "upcoming") return task.status !== "completed" && task.dueDate > today;

  const currentEmployee = data.employees.find((employee) => employee.id === data.currentUser.id);
  if (!currentEmployee) return false;
  if (scope === "mine") {
    const responsibleIds = new Set(
      [task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean),
    );
    return (
      responsibleIds.has(currentEmployee.id) ||
      (task.target.type === "user" && task.target.id === currentEmployee.id)
    );
  }
  if (scope === "department") {
    return task.target.type === "department" && task.target.id === currentEmployee.departmentId;
  }

  const currentGroupIds = new Set(
    data.groups
      .filter((group) => group.memberIds.includes(currentEmployee.id))
      .map((group) => group.id),
  );
  return task.target.type === "group" && currentGroupIds.has(task.target.id);
}

function taskResponsibleIds(task: Task) {
  return new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean));
}

function taskMatchesCollaborator(task: Task, employeeId: string) {
  return task.target.type === "user" && task.target.id === employeeId
    ? true
    : taskResponsibleIds(task).has(employeeId);
}

function taskMatchesDepartment(task: Task, departmentId: string, data: WorkspaceData) {
  if (task.target.type === "department" && task.target.id === departmentId) return true;
  const memberIds = new Set(
    [...data.employees, ...data.invitations]
      .filter((employee) => employee.departmentId === departmentId)
      .map((employee) => employee.id),
  );
  if (task.target.type === "user" && memberIds.has(task.target.id)) return true;
  return [...taskResponsibleIds(task)].some((id) => memberIds.has(id));
}

function taskMatchesGroup(task: Task, groupId: string) {
  return task.target.type === "group" && task.target.id === groupId;
}

type TaskLayoutPreferences = {
  layoutMode: "list" | "department" | "group";
  titleWidth: number;
  density: "compact" | "comfortable";
  showDescription: boolean;
};

const defaultLayoutPreferences: TaskLayoutPreferences = {
  layoutMode: "list",
  titleWidth: 340,
  density: "comfortable",
  showDescription: true,
};

function TasksPage() {
  const {
    lista: organizerListId,
    status: initialStatus,
    escopo: initialScope,
    setor: selectedDepartmentId,
    colaborador: selectedCollaboratorId,
    grupo: selectedGroupId,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isLoading, error } = useWorkspaceData();
  const [active, setActive] = useState<TaskStatus | "all">(initialStatus ?? "all");
  const [taskScope, setTaskScope] = useState<TaskScope>(initialScope ?? "all");
  const [search, setSearch] = useState("");
  const [directoryMode, setDirectoryMode] = useState<"departments" | "collaborators" | "groups">(
    selectedGroupId ? "groups" : selectedCollaboratorId ? "collaborators" : "departments",
  );
  const isFilteredTaskView = initialStatus !== undefined || initialScope !== undefined;
  const filters = emptyTaskFilters;
  const [isMounted, setIsMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [layoutPreferences, setLayoutPreferences] =
    useState<TaskLayoutPreferences>(defaultLayoutPreferences);
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(() => new Set());
  const [commentBody, setCommentBody] = useState("");
  const [form, setForm] = useState<TaskFormState>(() => {
    const dueDate = getDefaultDueDate();
    return {
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: "",
      responsibleId: "",
      responsibleIds: [],
      reviewerId: "",
      requiresReview: false,
      tags: "",
      checklist: "",
      recurrence: getDefaultRecurrence(dueDate),
    };
  });
  const [editForm, setEditForm] = useState<TaskEditState>(() => {
    const dueDate = getDefaultDueDate();
    return {
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      tags: "",
      targetKey: "",
      responsibleId: "",
      responsibleIds: [],
      recurrence: getDefaultRecurrence(dueDate),
    };
  });

  const applyScopeFilter = (scope: TaskScope) => {
    setTaskScope(scope);
    navigate({
      search: (current) => ({
        ...current,
        escopo: scope === "all" ? undefined : scope,
      }),
      replace: true,
    });
  };

  const {
    createTaskMutation,
    statusMutation,
    updateTaskMutation,
    deleteTaskMutation,
    commentMutation,
    attachmentMutation,
    addSubtaskMutation,
    toggleSubtaskMutation,
    deleteSubtaskMutation,
    reorderTaskMutation,
  } = useTaskMutations({
    onCompleted: () => setSelectedTaskId(null),
    onCreated: () => {
      setShowForm(false);
    },
    onUpdated: () => setSelectedTaskId(null),
    onDeleted: () => {
      setSelectedTaskId(null);
      setShowDeleteDialog(false);
    },
    onCommented: () => setCommentBody(""),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActive(initialStatus ?? "all");
    setTaskScope(initialScope ?? "all");
  }, [initialScope, initialStatus]);

  useEffect(() => {
    if (!isMounted) return;
    const stored = window.localStorage.getItem("pop-organize:task-layout");
    if (!stored) return;
    try {
      setLayoutPreferences({
        ...defaultLayoutPreferences,
        ...(JSON.parse(stored) as Partial<TaskLayoutPreferences>),
      });
    } catch {
      window.localStorage.removeItem("pop-organize:task-layout");
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem("pop-organize:task-layout", JSON.stringify(layoutPreferences));
  }, [isMounted, layoutPreferences]);

  useEffect(() => {
    if (!data) return;
    const pendingId = sessionStorage.getItem(PENDING_TASK_KEY);
    if (!pendingId) return;
    sessionStorage.removeItem(PENDING_TASK_KEY);
    const task = data.tasks.find((item) => item.id === pendingId);
    if (!task) return;
    setSelectedTaskId(task.id);
    setCommentBody("");
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(", "),
      targetKey: `${task.target.type}:${task.target.id}`,
      responsibleId: task.responsibleId,
      responsibleIds: [
        ...new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)),
      ],
      recurrence: recurrenceToForm(task.recurrence, task.dueDate),
    });
    updateTaskMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const selectedOrganizerList = data?.taskLists.find((item) => item.id === organizerListId);
  const organizerTaskIds = useMemo(
    () => new Set(selectedOrganizerList?.taskIds ?? []),
    [selectedOrganizerList?.taskIds],
  );
  const organizerTaskRows = useMemo(
    () =>
      (data?.tasks ?? []).filter((task) => !selectedOrganizerList || organizerTaskIds.has(task.id)),
    [data?.tasks, organizerTaskIds, selectedOrganizerList],
  );
  const taskRows = useMemo(
    () =>
      organizerTaskRows.filter((task) => {
        if (!data) return true;
        if (selectedDepartmentId) return taskMatchesDepartment(task, selectedDepartmentId, data);
        if (selectedCollaboratorId) return taskMatchesCollaborator(task, selectedCollaboratorId);
        if (selectedGroupId) return taskMatchesGroup(task, selectedGroupId);
        return true;
      }),
    [data, organizerTaskRows, selectedCollaboratorId, selectedDepartmentId, selectedGroupId],
  );
  const activeTaskRows = useMemo(
    () => taskRows.filter((task) => task.status !== "completed"),
    [taskRows],
  );
  const list = useMemo(
    () =>
      taskRows.filter(
        (t) =>
          (active === "completed"
            ? t.status === "completed"
            : t.status !== "completed" && (active === "all" || t.status === active)) &&
          (normalizedSearch === "" ||
            t.title.toLowerCase().includes(normalizedSearch) ||
            t.description.toLowerCase().includes(normalizedSearch)) &&
          (!data || taskMatchesAdminScope(t, taskScope, data)) &&
          (!data ||
            taskMatchesFilters(t, filters, { employees: data.employees, groups: data.groups })),
      ),
    [active, normalizedSearch, taskRows, taskScope, filters, data],
  );
  const completedTasks = useMemo(
    () =>
      active === "completed"
        ? []
        : taskRows.filter(
            (task) =>
              task.status === "completed" &&
              (normalizedSearch === "" ||
                task.title.toLowerCase().includes(normalizedSearch) ||
                task.description.toLowerCase().includes(normalizedSearch)) &&
              (!data || taskMatchesAdminScope(task, taskScope, data)),
          ),
    [active, normalizedSearch, taskRows, taskScope, data],
  );

  // Estes dois useMemo ficavam depois dos returns de carregamento e de erro logo abaixo. Enquanto
  // `data` nao chegava, o componente retornava cedo e nao os chamava; quando chegava, o render
  // seguinte chamava mais hooks que o anterior e o React derrubava a tela inteira ("Rendered more
  // hooks than during the previous render"). Por isso leem de `data` tolerando nulo, e ficam antes
  // de qualquer return condicional.
  const dataDepartments = data?.departments;
  const dataGroups = data?.groups;
  const taskSections = useMemo(() => {
    if (layoutPreferences.layoutMode === "department") {
      return [
        ...(dataDepartments ?? []).map((department) => ({
          id: `department:${department.id}`,
          label: department.name,
          tasks: list.filter(
            (task) => task.target.type === "department" && task.target.id === department.id,
          ),
        })),
        {
          id: "department:other",
          label: "Outras atividades",
          tasks: list.filter((task) => task.target.type !== "department"),
        },
      ].filter((section) => section.tasks.length > 0);
    }
    if (layoutPreferences.layoutMode === "group") {
      return [
        ...(dataGroups ?? []).map((group) => ({
          id: `group:${group.id}`,
          label: group.name,
          tasks: list.filter((task) => task.target.type === "group" && task.target.id === group.id),
        })),
        {
          id: "group:other",
          label: "Outras atividades",
          tasks: list.filter((task) => task.target.type !== "group"),
        },
      ].filter((section) => section.tasks.length > 0);
    }
    return [{ id: "all", label: "Todas as atividades", tasks: list }];
  }, [layoutPreferences.layoutMode, dataDepartments, dataGroups, list]);

  const organizerToday = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const organizerCounts = useMemo(
    () => ({
      all: activeTaskRows.length,
      overdue: activeTaskRows.filter((task) => task.dueDate < organizerToday).length,
      today: activeTaskRows.filter((task) => task.dueDate === organizerToday).length,
      upcoming: activeTaskRows.filter((task) => task.dueDate > organizerToday).length,
    }),
    [activeTaskRows, organizerToday],
  );

  if (isLoading) {
    return (
      <AppShell title="Tarefas" subtitle="Carregando demandas da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Tarefas" subtitle="Acompanhe e organize todas as demandas da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const {
    company,
    currentUser,
    departments,
    employees,
    groups,
    invitations,
    permissionGroups,
    tasks,
  } = data;
  const assignmentMembers = [
    ...employees,
    ...invitations.map((invitation) => ({
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: "Convite pendente",
      departmentId: invitation.departmentId,
      groupIds: invitation.groupIds,
      status: invitation.status,
      permissionGroupId: invitation.permissionGroupId,
    })),
  ];
  // `assignmentMembers` mistura funcionários com convites pendentes DE PROPÓSITO, para permitir
  // atribuir tarefa antes do aceite. Mas contá-lo como "cadastrados" fazia a Aurora Café anunciar
  // "13 cadastrados" onde a tela Funcionários e o Dashboard dizem 7 — os dois números certos sobre
  // coisas diferentes, com a mesma palavra. Quem é cadastrado é funcionário; convite é convite, e
  // aparece separado porque a lista logo abaixo tem as duas coisas e sumir com os 6 seria pior.
  const pendingInvitationCount = invitations.length;
  const permissionSet = resolvePermissionSet({
    currentUser,
    employees,
    permissionGroups,
  });
  const canSeePeopleContext =
    isAdminUser({ currentUser, employees, permissionGroups }) ||
    (["pages.employees", "pages.reports", "manage.employees"] as PermissionKey[]).some((key) =>
      hasPermission(permissionSet, key),
    );
  const canCreateTask = hasPermission(permissionSet, "tasks.create");
  const isPersonalWorkspace = company.kind === "personal";
  const showResponsible = canSeePeopleContext && !isPersonalWorkspace;
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;
  const selectedDirectoryDepartment = selectedDepartmentId
    ? departments.find((department) => department.id === selectedDepartmentId)
    : null;
  const selectedDirectoryCollaborator = selectedCollaboratorId
    ? assignmentMembers.find((employee) => employee.id === selectedCollaboratorId)
    : null;
  const selectedDirectoryGroup = selectedGroupId
    ? groups.find((group) => group.id === selectedGroupId)
    : null;
  const hasDirectorySelection = Boolean(
    selectedDirectoryDepartment || selectedDirectoryCollaborator || selectedDirectoryGroup,
  );
  const selectedPermissions = selectedTask
    ? getTaskPermissions({
        task: selectedTask,
        currentUser,
        employees,
        departments,
        groups,
        permissionGroups: data.permissionGroups,
      })
    : null;
  const targetOptions = isPersonalWorkspace
    ? [{ value: `user:${currentUser.id}`, label: "Somente eu" }]
    : [
        { value: `company:${company.id}`, label: "Empresa inteira" },
        ...departments.map((department) => ({
          value: `department:${department.id}`,
          label: department.name,
        })),
        ...groups.map((group) => ({
          value: `group:${group.id}`,
          label: `Grupo: ${group.name}`,
        })),
        ...assignmentMembers.map((employee) => ({
          value: `user:${employee.id}`,
          label: employee.name,
        })),
      ];

  function openForm() {
    const dueDate = getDefaultDueDate();
    setForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: isPersonalWorkspace ? `user:${currentUser.id}` : "",
      responsibleId: "",
      responsibleIds: [],
      reviewerId: "",
      requiresReview: false,
      tags: "",
      checklist: "",
      recurrence: getDefaultRecurrence(dueDate),
    });
    createTaskMutation.reset();
    setShowForm(true);
  }

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setCommentBody("");
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(", "),
      targetKey: `${task.target.type}:${task.target.id}`,
      responsibleId: task.responsibleId,
      responsibleIds: [
        ...new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)),
      ],
      recurrence: recurrenceToForm(task.recurrence, task.dueDate),
    });
    updateTaskMutation.reset();
  }

  function handleSubmit(submittedForm: TaskFormState) {
    const [selectedType, selectedId] = submittedForm.targetKey.split(":") as [TargetType, string];
    const type = isPersonalWorkspace ? "user" : selectedType;
    const id = isPersonalWorkspace ? currentUser.id : selectedId;
    const responsibleId = type === "user" ? id : submittedForm.responsibleId;

    createTaskMutation.mutate({
      title: submittedForm.title,
      description: submittedForm.description,
      priority: submittedForm.priority,
      dueDate: submittedForm.dueDate,
      target: { type, id },
      responsibleId,
      responsibleIds: type === "user" ? [id] : submittedForm.responsibleIds,
      reviewerId:
        !isPersonalWorkspace && submittedForm.requiresReview
          ? submittedForm.reviewerId || undefined
          : undefined,
      requiresReview: !isPersonalWorkspace && submittedForm.requiresReview,
      tags: submittedForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      checklist: submittedForm.checklist
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(submittedForm.recurrence),
    });
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedTask) return;
    const [selectedType, selectedId] = editForm.targetKey.split(":") as [TargetType, string];

    updateTaskMutation.mutate({
      id: selectedTask.id,
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      dueDate: editForm.dueDate,
      target: { type: selectedType, id: selectedId },
      responsibleId: selectedType === "user" ? selectedId : editForm.responsibleId,
      responsibleIds: selectedType === "user" ? [selectedId] : editForm.responsibleIds,
      tags: editForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(editForm.recurrence),
    });
  }

  function handleReorderTask(task: Task, beforeTaskId: string | null) {
    setMovingTaskId(task.id);
    window.setTimeout(() => {
      reorderTaskMutation.mutate(
        { taskId: task.id, beforeTaskId },
        { onSettled: () => setMovingTaskId(null) },
      );
    }, 180);
  }

  function handleDeleteSelectedTask() {
    if (!selectedTask) return;
    setShowDeleteDialog(true);
  }

  function handleCommentSubmit() {
    if (!selectedTask || !commentBody.trim()) return;
    commentMutation.mutate({ taskId: selectedTask.id, body: commentBody.trim() });
  }

  function handleAttachmentFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedTask) return;
    attachmentMutation.mutate({
      taskId: selectedTask.id,
      name: file.name,
      sizeLabel: formatFileSizeMb(file.size),
    });
  }

  const mutationError =
    createTaskMutation.error instanceof Error ? createTaskMutation.error.message : null;
  const updateError =
    updateTaskMutation.error instanceof Error ? updateTaskMutation.error.message : null;
  const statusError = statusMutation.error instanceof Error ? statusMutation.error.message : null;
  const deleteError =
    deleteTaskMutation.error instanceof Error ? deleteTaskMutation.error.message : null;
  const commentError =
    commentMutation.error instanceof Error ? commentMutation.error.message : null;
  const attachmentError =
    attachmentMutation.error instanceof Error ? attachmentMutation.error.message : null;
  const subtaskError =
    addSubtaskMutation.error instanceof Error
      ? addSubtaskMutation.error.message
      : toggleSubtaskMutation.error instanceof Error
        ? toggleSubtaskMutation.error.message
        : deleteSubtaskMutation.error instanceof Error
          ? deleteSubtaskMutation.error.message
          : null;

  const taskDetailLayer = isMounted
    ? createPortal(
        <>
          <div
            className={cn(
              "fixed inset-0 z-[190] bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              selectedTask ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => setSelectedTaskId(null)}
            aria-hidden={!selectedTask}
          />
          <aside
            className={cn(
              "fixed inset-y-0 right-0 z-[200] flex h-dvh w-[94vw] flex-col overflow-hidden rounded-l-[28px] border-l border-white/70 bg-background transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[50vw] sm:min-w-[420px] sm:max-w-[680px]",
              selectedTask ? "translate-x-0" : "translate-x-full",
            )}
            aria-hidden={!selectedTask}
          >
            {selectedTask && selectedPermissions && (
              <TaskDetailDrawer
                task={selectedTask}
                permissions={selectedPermissions}
                employees={assignmentMembers}
                departments={departments}
                groups={groups}
                company={company}
                editForm={editForm}
                onEditFormChange={setEditForm}
                onSubmit={handleEditSubmit}
                onClose={() => setSelectedTaskId(null)}
                onStatusChange={(status) =>
                  statusMutation.mutate({
                    id: selectedTask.id,
                    status,
                  })
                }
                onReorder={(position) => {
                  const first = activeTaskRows.find((task) => task.id !== selectedTask.id);
                  handleReorderTask(
                    selectedTask,
                    position === "start" ? (first?.id ?? null) : null,
                  );
                }}
                onDelete={handleDeleteSelectedTask}
                isSaving={updateTaskMutation.isPending}
                isMoving={movingTaskId === selectedTask.id}
                isDeleting={deleteTaskMutation.isPending}
                isStatusPending={statusMutation.isPending}
                commentBody={commentBody}
                onCommentBodyChange={setCommentBody}
                onCommentSubmit={handleCommentSubmit}
                isCommenting={commentMutation.isPending}
                onAttachmentFile={handleAttachmentFile}
                isAttaching={attachmentMutation.isPending}
                subtasks={selectedTask.subtasks}
                onAddSubtask={(title) =>
                  addSubtaskMutation.mutate({ taskId: selectedTask.id, title })
                }
                onToggleSubtask={(subtaskId, done) =>
                  toggleSubtaskMutation.mutate({ taskId: selectedTask.id, subtaskId, done })
                }
                onDeleteSubtask={(subtaskId) =>
                  deleteSubtaskMutation.mutate({ taskId: selectedTask.id, subtaskId })
                }
                isAddingSubtask={addSubtaskMutation.isPending}
                errorMessage={
                  updateError ??
                  statusError ??
                  deleteError ??
                  commentError ??
                  attachmentError ??
                  subtaskError
                }
              />
            )}
          </aside>
        </>,
        document.body,
      )
    : null;

  return (
    <AppShell
      title={selectedOrganizerList?.name ?? "Tarefas"}
      subtitle={
        selectedOrganizerList
          ? "Tarefas selecionadas para esta lista"
          : "Acompanhe e organize todas as demandas da empresa"
      }
      actions={
        canCreateTask ? (
          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => openPopAssistant()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              Criar com a Pop
            </button>
            <button
              onClick={openForm}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/16">
                <Plus className="h-4 w-4" />
              </span>
              Nova tarefa
            </button>
          </div>
        ) : undefined
      }
    >
      {organizerListId && !selectedOrganizerList && (
        <section className="task-glass-panel mb-4 rounded-[20px] border border-dashed border-border p-4">
          <p className="text-sm font-semibold">Esta lista não existe mais.</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/tarefas", search: { lista: undefined } })}
            className="mt-2 text-xs font-bold text-primary"
          >
            Voltar para todas as tarefas
          </button>
        </section>
      )}

      {selectedOrganizerList && (
        <section className="task-glass-panel mb-4 rounded-[22px] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Lista
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-bold">
                {selectedOrganizerList.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/tarefas", search: { lista: undefined } })}
              className="task-glass-control inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-bold text-foreground/70 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Todas as tarefas
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["all", "Todas", organizerCounts.all],
                ["overdue", "Atrasadas", organizerCounts.overdue],
                ["today", "Hoje", organizerCounts.today],
                ["upcoming", "Próximas", organizerCounts.upcoming],
              ] as const
            ).map(([scope, label, count]) => (
              <button
                key={scope}
                type="button"
                onClick={() => applyScopeFilter(scope)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition",
                  taskScope === scope
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border/65 bg-background/55 hover:border-primary/25",
                )}
              >
                <span className="block text-2xl font-bold tabular-nums">{count}</span>
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!isPersonalWorkspace &&
        !hasDirectorySelection &&
        !selectedOrganizerList &&
        !isFilteredTaskView && (
          <section className="task-glass-panel mb-4 rounded-[22px] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  Organizar tarefas
                </p>
                <h2 className="mt-1 font-display text-lg font-bold">
                  Setores, colaboradores ou grupos
                </h2>
              </div>
              {(selectedDepartmentId || selectedCollaboratorId || selectedGroupId) && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      search: (current) => ({
                        ...current,
                        setor: undefined,
                        colaborador: undefined,
                        grupo: undefined,
                      }),
                    })
                  }
                  className="task-glass-control inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold text-foreground/70 hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" /> Mostrar todas
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setDirectoryMode("departments");
                  navigate({
                    search: (current) => ({
                      ...current,
                      setor: undefined,
                      colaborador: undefined,
                      grupo: undefined,
                    }),
                  });
                }}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  directoryMode === "departments"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/65 bg-background/55 hover:border-primary/25",
                )}
              >
                <Layers3 className="mb-2 h-4 w-4" />
                <span className="block text-sm font-bold">Setores</span>
                <span className="text-[11px] text-muted-foreground">
                  {departments.length} cadastrados
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirectoryMode("collaborators");
                  navigate({
                    search: (current) => ({
                      ...current,
                      setor: undefined,
                      colaborador: undefined,
                      grupo: undefined,
                    }),
                  });
                }}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  directoryMode === "collaborators"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/65 bg-background/55 hover:border-primary/25",
                )}
              >
                <Users className="mb-2 h-4 w-4" />
                <span className="block text-sm font-bold">Colaboradores</span>
                <span className="text-[11px] text-muted-foreground">
                  {employees.length} cadastrados
                  {pendingInvitationCount > 0
                    ? ` · ${pendingInvitationCount} ${pendingInvitationCount === 1 ? "convite" : "convites"}`
                    : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirectoryMode("groups");
                  navigate({
                    search: (current) => ({
                      ...current,
                      setor: undefined,
                      colaborador: undefined,
                      grupo: undefined,
                    }),
                  });
                }}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  directoryMode === "groups"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/65 bg-background/55 hover:border-primary/25",
                )}
              >
                <Network className="mb-2 h-4 w-4" />
                <span className="block text-sm font-bold">Grupos</span>
                <span className="text-[11px] text-muted-foreground">
                  {groups.length} cadastrados
                </span>
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {directoryMode === "departments"
                ? departments.map((department) => {
                    const count = tasks.filter((task) =>
                      taskMatchesDepartment(task, department.id, data),
                    ).length;
                    const selected = selectedDepartmentId === department.id;
                    return (
                      <button
                        key={department.id}
                        type="button"
                        onClick={() =>
                          navigate({
                            search: (current) => ({
                              ...current,
                              setor: department.id,
                              colaborador: undefined,
                              grupo: undefined,
                            }),
                          })
                        }
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                          selected
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/60 bg-background/55 hover:border-primary/25",
                        )}
                      >
                        <span className="truncate text-xs font-bold">{department.name}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    );
                  })
                : directoryMode === "groups"
                  ? groups.map((group) => {
                      const count = tasks.filter((task) => taskMatchesGroup(task, group.id)).length;
                      const selected = selectedGroupId === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() =>
                            navigate({
                              search: (current) => ({
                                ...current,
                                setor: undefined,
                                colaborador: undefined,
                                grupo: group.id,
                              }),
                            })
                          }
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                            selected
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/60 bg-background/55 hover:border-primary/25",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">{group.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {group.memberIds.length} membros
                            </span>
                          </span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        </button>
                      );
                    })
                  : assignmentMembers.map((employee) => {
                      const count = tasks.filter((task) =>
                        taskMatchesCollaborator(task, employee.id),
                      ).length;
                      const selected = selectedCollaboratorId === employee.id;
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() =>
                            navigate({
                              search: (current) => ({
                                ...current,
                                setor: undefined,
                                colaborador: employee.id,
                                grupo: undefined,
                              }),
                            })
                          }
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                            selected
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/60 bg-background/55 hover:border-primary/25",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">
                              {employee.name}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {employee.role}
                            </span>
                          </span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        </button>
                      );
                    })}
            </div>
          </section>
        )}

      {!isPersonalWorkspace &&
        (selectedDirectoryDepartment ||
          selectedDirectoryCollaborator ||
          selectedDirectoryGroup) && (
          <section className="task-glass-panel mb-4 rounded-[22px] p-4 sm:p-5">
            <button
              type="button"
              onClick={() =>
                navigate({
                  search: (current) => ({
                    ...current,
                    setor: undefined,
                    colaborador: undefined,
                    grupo: undefined,
                  }),
                })
              }
              className="task-glass-control inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold text-foreground/70 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para categorias
            </button>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {selectedDirectoryDepartment
                    ? "Tarefas do setor"
                    : selectedDirectoryGroup
                      ? "Tarefas do grupo"
                      : "Tarefas do colaborador"}
                </p>
                <h2 className="mt-1 truncate font-display text-xl font-bold">
                  {selectedDirectoryDepartment?.name ??
                    selectedDirectoryGroup?.name ??
                    selectedDirectoryCollaborator?.name}
                </h2>
                {selectedDirectoryCollaborator && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tarefas individuais e atividades atribuídas a esta pessoa
                  </p>
                )}
                {selectedDirectoryGroup && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Somente tarefas destinadas a este grupo
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                {taskRows.length} {taskRows.length === 1 ? "tarefa" : "tarefas"}
              </span>
            </div>
          </section>
        )}

      {(isPersonalWorkspace ||
        hasDirectorySelection ||
        selectedOrganizerList ||
        isFilteredTaskView) && (
        <>
          <div className="mb-4 flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="task-glass-control flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[18px] px-3 transition-colors focus-within:border-primary/45 sm:px-4 md:h-11">
              <Search className="h-4 w-4 text-primary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefas..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
              />
            </div>
            {canCreateTask && (
              <>
                <button
                  onClick={() => openPopAssistant()}
                  className="pressable inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-bold text-primary transition hover:bg-primary/15 lg:hidden"
                  aria-label="Criar com a Pop"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Pop</span>
                </button>
                <button
                  onClick={openForm}
                  className="pressable inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:px-4 lg:hidden"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/16">
                    <Plus className="h-4 w-4" />
                  </span>
                  Nova
                </button>
              </>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "list", label: "Lista", icon: Columns3 },
                  { value: "department", label: "Por setor", icon: Layers3 },
                  { value: "group", label: "Por grupo", icon: Network },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setLayoutPreferences((current) => ({
                        ...current,
                        layoutMode: option.value,
                      }))
                    }
                    className={cn(
                      "task-glass-control pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition",
                      layoutPreferences.layoutMode === option.value &&
                        "border-primary/25 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowLayoutSettings((current) => !current)}
                className={cn(
                  "task-glass-control pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition",
                  showLayoutSettings && "border-primary/25 text-primary",
                )}
              >
                <Settings2 className="h-4 w-4" />
                Personalizar layout
              </button>
            </div>
            <span className="hidden text-xs text-muted-foreground lg:inline">
              Arraste a barra azul ao lado de “Atividade” para aumentar ou diminuir.
            </span>
          </div>

          {showLayoutSettings && (
            <section className="task-glass-panel mb-4 grid gap-4 rounded-[20px] p-4 sm:grid-cols-3">
              <label className="space-y-2 text-xs font-semibold">
                <span className="flex items-center justify-between gap-2 text-foreground">
                  <span className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-primary" />
                    Largura da atividade
                  </span>
                  <span className="text-[10px] text-primary">{layoutPreferences.titleWidth}px</span>
                </span>
                <input
                  type="range"
                  min={240}
                  max={680}
                  step={20}
                  value={layoutPreferences.titleWidth}
                  onChange={(event) =>
                    setLayoutPreferences((current) => ({
                      ...current,
                      titleWidth: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold">
                <span className="text-foreground">Espaçamento das linhas</span>
                <select
                  value={layoutPreferences.density}
                  onChange={(event) =>
                    setLayoutPreferences((current) => ({
                      ...current,
                      density: event.target.value as TaskLayoutPreferences["density"],
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/70 px-3 outline-none"
                >
                  <option value="comfortable">Confortável</option>
                  <option value="compact">Compacto</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-border/60 bg-background/55 px-3 text-xs font-semibold">
                Mostrar notas na tabela
                <input
                  type="checkbox"
                  checked={layoutPreferences.showDescription}
                  onChange={(event) =>
                    setLayoutPreferences((current) => ({
                      ...current,
                      showDescription: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-primary"
                />
              </label>
            </section>
          )}

          <div className="space-y-4">
            {taskSections.map((section) => {
              const collapsed = collapsedDepartments.has(section.id);
              return (
                <section key={section.id}>
                  {layoutPreferences.layoutMode !== "list" && (
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedDepartments((current) => {
                          const next = new Set(current);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        })
                      }
                      className="mb-1 flex w-full items-center justify-between border-b border-border/70 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <span className="font-display text-sm font-bold">{section.label}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {section.tasks.length} atividades
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
                        />
                      </span>
                    </button>
                  )}
                  {!collapsed && (
                    <TaskList
                      tasks={section.tasks}
                      employees={assignmentMembers}
                      departments={departments}
                      groups={groups}
                      permissionGroups={data.permissionGroups}
                      currentUser={currentUser}
                      showResponsible={showResponsible}
                      selectedTaskId={selectedTaskId}
                      onOpen={openTask}
                      onComplete={(task) =>
                        statusMutation.mutate({ id: task.id, status: "completed" })
                      }
                      onReorder={handleReorderTask}
                      movingTaskId={movingTaskId}
                      isCompleting={statusMutation.isPending}
                      preferences={layoutPreferences}
                      onTitleWidthChange={(titleWidth) =>
                        setLayoutPreferences((current) => ({ ...current, titleWidth }))
                      }
                    />
                  )}
                </section>
              );
            })}
          </div>

          {list.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              {completedTasks.length > 0
                ? "Nenhuma tarefa ativa neste filtro."
                : "Nenhuma tarefa encontrada."}
            </div>
          )}

          {completedTasks.length > 0 && (
            <section className="task-glass-panel mt-6 overflow-hidden rounded-[22px] md:rounded-[22px]">
              <button
                type="button"
                onClick={() => setShowCompleted((current) => !current)}
                className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.025] md:px-6"
              >
                <span className="inline-flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-border/70 bg-background/70 text-primary transition-colors group-hover:text-primary">
                    <Archive className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      Tarefas concluídas
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {completedTasks.length}{" "}
                      {completedTasks.length === 1 ? "atividade" : "atividades"} arquivada
                      {completedTasks.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-primary",
                    showCompleted && "rotate-180",
                  )}
                />
              </button>

              {showCompleted && (
                <div className="grid grid-cols-1 gap-3 border-t border-border/60 bg-background/35 p-4 animate-in fade-in slide-in-from-top-1 duration-150 md:grid-cols-2 md:p-5 xl:grid-cols-3">
                  {completedTasks.map((task) => {
                    const emp = employees.find((employee) => employee.id === task.responsibleId);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTask(task)}
                        className="task-glass-control pressable rounded-[16px] p-4 text-left opacity-80 hover:border-primary/35 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground line-through">
                              {task.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {task.description}
                            </p>
                            {task.recurrence && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                <Repeat className="h-3 w-3" />
                                {recurrenceLabel(task.recurrence)}
                              </div>
                            )}
                          </div>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <div
                          className={cn(
                            "mt-3 flex items-center gap-3 text-[11px] text-muted-foreground",
                            showResponsible ? "justify-between" : "justify-end",
                          )}
                        >
                          {showResponsible && (
                            <span className="truncate">
                              {emp?.name ?? unassignedResponsibleLabel(task.target.type)}
                            </span>
                          )}
                          <span>
                            {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {taskDetailLayer}

      <RecurringDeleteDialog
        task={selectedTask ?? null}
        open={showDeleteDialog}
        pending={deleteTaskMutation.isPending}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={(scope) => {
          if (!selectedTask) return;
          deleteTaskMutation.mutate({
            id: selectedTask.id,
            scope,
            occurrenceDate: selectedTask.dueDate,
          });
        }}
      />

      <TaskCreateDrawer
        open={showForm}
        onOpenChange={setShowForm}
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={createTaskMutation.isPending}
        errorMessage={mutationError}
        employees={assignmentMembers}
        departments={departments}
        groups={groups}
        targetOptions={targetOptions}
        personalMode={isPersonalWorkspace}
      />
    </AppShell>
  );
}
