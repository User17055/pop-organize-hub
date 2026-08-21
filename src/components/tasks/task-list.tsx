import { Calendar, Check, GripVertical, ListChecks, MessageSquare, Paperclip } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import { PriorityBadge, StatusBadge } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { CurrentUser, Department, Employee, Group, PermissionGroup, Task } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { EmployeeAvatar } from "./employee-avatar";
import { isOverdue, taskTargetLabel } from "./task-form-types";

type MobileDragState = {
  taskId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startScrollY: number;
  deltaX: number;
  deltaY: number;
  beforeTaskId: string | null;
  hasMoved: boolean;
};

type PendingMobileDrag = {
  taskId: string;
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLDivElement;
  timer: ReturnType<typeof setTimeout>;
};

const MOBILE_LONG_PRESS_MS = 360;
const MOBILE_SCROLL_CANCEL_DISTANCE = 10;

function subtaskProgress(task: Task) {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) return null;
  return { done: subtasks.filter((item) => item.done).length, total: subtasks.length };
}

const MOBILE_STAGGER_TASK_LIMIT = 30;

function TaskListImpl({
  tasks,
  employees,
  departments,
  groups,
  permissionGroups,
  currentUser,
  showResponsible = true,
  selectedTaskId,
  onOpen,
  onComplete,
  onReorder,
  movingTaskId,
  isCompleting,
  preferences,
  onTitleWidthChange,
}: {
  tasks: Task[];
  employees: Employee[];
  departments: Department[];
  groups: Group[];
  permissionGroups: PermissionGroup[];
  currentUser: CurrentUser;
  showResponsible?: boolean;
  selectedTaskId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReorder?: (task: Task, beforeTaskId: string | null) => void;
  movingTaskId?: string | null;
  isCompleting: boolean;
  preferences?: {
    titleWidth: number;
    density: "compact" | "comfortable";
    showDescription: boolean;
  };
  onTitleWidthChange?: (width: number) => void;
}) {
  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);
  const getEmployee = (id: string) => employeeById.get(id);
  const permissionsByTaskId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getTaskPermissions>>();
    for (const task of tasks) {
      map.set(
        task.id,
        getTaskPermissions({ task, currentUser, employees, departments, groups, permissionGroups }),
      );
    }
    return map;
  }, [tasks, currentUser, employees, departments, groups, permissionGroups]);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [mobileDrag, setMobileDrag] = useState<MobileDragState | null>(null);
  const mobileDragRef = useRef<MobileDragState | null>(null);
  const pendingMobileDragRef = useRef<PendingMobileDrag | null>(null);
  const ignoreMobileClickUntilRef = useRef(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tablePreferences = preferences ?? {
    titleWidth: 340,
    density: "comfortable" as const,
    showDescription: true,
  };
  function startTitleResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!onTitleWidthChange) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = tablePreferences.titleWidth;
    const onMove = (moveEvent: PointerEvent) => {
      onTitleWidthChange(Math.min(680, Math.max(240, startWidth + moveEvent.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function clearPendingMobileDrag(pointerId?: number) {
    const pending = pendingMobileDragRef.current;
    if (!pending || (pointerId !== undefined && pending.pointerId !== pointerId)) return;
    clearTimeout(pending.timer);
    pendingMobileDragRef.current = null;
  }

  function activateMobileDrag(pointerId: number) {
    const pending = pendingMobileDragRef.current;
    if (!pending || pending.pointerId !== pointerId) return;

    try {
      pending.element.setPointerCapture(pointerId);
    } catch {
      clearPendingMobileDrag(pointerId);
      return;
    }

    pendingMobileDragRef.current = null;
    const nextDrag: MobileDragState = {
      taskId: pending.taskId,
      pointerId: pending.pointerId,
      startX: pending.startX,
      startY: pending.startY,
      startScrollY: window.scrollY,
      deltaX: 0,
      deltaY: 0,
      beforeTaskId: null,
      hasMoved: false,
    };
    mobileDragRef.current = nextDrag;
    setMobileDrag(nextDrag);
    setDraggedTaskId(pending.taskId);
    ignoreMobileClickUntilRef.current = Date.now() + 600;
    document.body.style.userSelect = "none";
    navigator.vibrate?.(18);
  }

  function startMobileDrag(event: ReactPointerEvent<HTMLDivElement>, task: Task) {
    if (!onReorder || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;

    clearPendingMobileDrag();
    pendingMobileDragRef.current = {
      taskId: task.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      element: event.currentTarget,
      timer: setTimeout(() => activateMobileDrag(event.pointerId), MOBILE_LONG_PRESS_MS),
    };
  }

  function moveMobileDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const current = mobileDragRef.current;
    if (!current || current.pointerId !== event.pointerId) {
      const pending = pendingMobileDragRef.current;
      if (
        pending?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) >
          MOBILE_SCROLL_CANCEL_DISTANCE
      ) {
        clearPendingMobileDrag(event.pointerId);
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY + (window.scrollY - current.startScrollY);
    const hasMoved = current.hasMoved || Math.hypot(deltaX, deltaY) > 5;
    let beforeTaskId = current.beforeTaskId;

    if (hasMoved) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mobile-task-id]"),
      ).filter((element) => element.dataset.mobileTaskId !== current.taskId);
      const nextCandidate = candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
      });
      beforeTaskId = nextCandidate?.dataset.mobileTaskId ?? null;

      const scrollEdge = 72;
      if (event.clientY < scrollEdge) {
        window.scrollBy({ top: -14, behavior: "auto" });
      } else if (event.clientY > window.innerHeight - scrollEdge) {
        window.scrollBy({ top: 14, behavior: "auto" });
      }
    }

    const nextDrag = { ...current, deltaX, deltaY, beforeTaskId, hasMoved };
    mobileDragRef.current = nextDrag;
    setMobileDrag(nextDrag);
  }

  function finishMobileDrag(event: ReactPointerEvent<HTMLDivElement>, commit: boolean) {
    clearPendingMobileDrag(event.pointerId);
    const current = mobileDragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    ignoreMobileClickUntilRef.current = Date.now() + 600;
    document.body.style.userSelect = "";
    mobileDragRef.current = null;
    setMobileDrag(null);
    setDraggedTaskId(null);

    if (!commit || !current.hasMoved) return;
    const source = tasks.find((item) => item.id === current.taskId);
    if (!source) return;

    const tasksWithoutSource = tasks.filter((item) => item.id !== current.taskId);
    const destinationIndex =
      current.beforeTaskId === null
        ? tasksWithoutSource.length
        : tasksWithoutSource.findIndex((item) => item.id === current.beforeTaskId);
    const originalIndex = tasks.findIndex((item) => item.id === current.taskId);
    if (destinationIndex === originalIndex) return;

    onReorder?.(source, current.beforeTaskId);
  }

  useEffect(() => {
    const preventTouchScrollWhileDragging = (event: TouchEvent) => {
      if (mobileDragRef.current) event.preventDefault();
    };
    document.addEventListener("touchmove", preventTouchScrollWhileDragging, { passive: false });

    return () => {
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (pendingMobileDragRef.current) clearTimeout(pendingMobileDragRef.current.timer);
      pendingMobileDragRef.current = null;
      document.body.style.userSelect = "";
      document.removeEventListener("touchmove", preventTouchScrollWhileDragging);
    };
  }, []);

  function completeFromMobile(task: Task) {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    setCelebratingTaskId(task.id);
    completionTimerRef.current = setTimeout(() => {
      onComplete(task);
      setCelebratingTaskId(null);
    }, 520);
  }

  return (
    <>
      {/* Desktop dense table */}
      <div className="task-glass-panel hidden overflow-x-auto rounded-[24px] p-4 lg:block xl:p-5">
        <Table
          className="table-fixed border-separate border-spacing-y-3"
          style={{ minWidth: `${showResponsible ? 1160 : 970}px` }}
        >
          <colgroup>
            <col style={{ width: 56 }} />
            <col style={{ width: tablePreferences.titleWidth }} />
            {showResponsible && <col style={{ width: 190 }} />}
            <col style={{ width: 190 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 125 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 115 }} />
          </colgroup>
          <TableHeader className="[&_th]:h-8 [&_th]:px-4 [&_th]:pb-1 [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-foreground/38 [&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="w-14"></TableHead>
              <TableHead className="relative">
                Atividade
                {onTitleWidthChange && (
                  <button
                    type="button"
                    onPointerDown={startTitleResize}
                    className="group/resize absolute -right-2 inset-y-0 z-10 flex w-5 cursor-col-resize touch-none items-center justify-center"
                    aria-label="Ajustar largura da coluna de atividade"
                    title="Arraste para aumentar ou diminuir a atividade"
                  >
                    <span className="h-6 w-1 rounded-full bg-primary/35 shadow-[0_0_0_1px_var(--background)] transition group-hover/resize:h-8 group-hover/resize:bg-primary" />
                  </button>
                )}
              </TableHead>
              {showResponsible && <TableHead>Responsável</TableHead>}
              <TableHead>Visível para</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-0">
            {tasks.map((task) => {
              const emp = getEmployee(task.responsibleId);
              const overdue = isOverdue(task);
              const permissions = permissionsByTaskId.get(task.id)!;
              const progress = subtaskProgress(task);
              return (
                <ContextMenu key={task.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      draggable={Boolean(onReorder && permissions.canMove)}
                      onDragStart={(event) => {
                        setDraggedTaskId(task.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task.id);
                      }}
                      onDragOver={(event) => {
                        if (draggedTaskId && draggedTaskId !== task.id) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = event.dataTransfer.getData("text/plain") || draggedTaskId;
                        const source = tasks.find((item) => item.id === sourceId);
                        if (source && source.id !== task.id) onReorder?.(source, task.id);
                        setDraggedTaskId(null);
                      }}
                      onDragEnd={() => setDraggedTaskId(null)}
                      onClick={() => onOpen(task)}
                      className={cn(
                        "task-glass-row group cursor-pointer border-0 transition-all duration-300 hover:text-foreground",
                        movingTaskId === task.id && "translate-x-3 scale-[0.985] opacity-35",
                        draggedTaskId === task.id && "scale-[0.985] opacity-45",
                        tablePreferences.density === "compact" && "[&_td]:!py-2.5",
                        overdue && "bg-destructive/[0.05] hover:bg-destructive/[0.08]",
                        selectedTaskId === task.id && "task-row-selected",
                      )}
                    >
                      <TableCell className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onReorder && permissions.canMove && (
                            <GripVertical className="h-4 w-4 cursor-grab text-primary/55 active:cursor-grabbing" />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!permissions.canChangeStatus || isCompleting) return;
                              onComplete(task);
                            }}
                            disabled={!permissions.canChangeStatus || isCompleting}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-[9px] border-2 bg-white/72 transition-all duration-300 disabled:opacity-40",
                              overdue
                                ? "border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/15"
                                : "border-primary/30 text-primary hover:border-primary hover:bg-primary/15",
                            )}
                            aria-label="Concluir tarefa"
                          >
                            <Check className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div
                          className="truncate font-display text-[15px] font-semibold leading-tight text-foreground"
                          title={task.title}
                        >
                          {task.title}
                        </div>
                        {tablePreferences.showDescription && task.description && (
                          <div
                            className={cn(
                              "mt-1.5 text-xs leading-relaxed text-muted-foreground",
                              tablePreferences.density === "compact"
                                ? "line-clamp-1"
                                : "line-clamp-3",
                            )}
                          >
                            {task.description}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          {task.comments > 0 && (
                            <span className="task-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                              <MessageSquare className="h-3 w-3" /> {task.comments}
                            </span>
                          )}
                          {task.attachments > 0 && (
                            <span className="task-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                              <Paperclip className="h-3 w-3" /> {task.attachments}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {showResponsible && (
                        <TableCell className="px-4 py-4">
                          {task.target.type !== "user" ? (
                            <div className="flex items-center gap-2">
                              <EmployeeAvatar employee={emp} departments={departments} size="sm" />
                              <span className="truncate text-sm font-medium text-foreground/75">
                                {emp?.name ??
                                  (task.target.type === "department"
                                    ? "Setor inteiro"
                                    : "Sem responsável")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/45">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-4">
                        <span
                          className="task-chip inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold text-foreground/62"
                          title={taskTargetLabel(task.target)}
                        >
                          <span className="truncate">{taskTargetLabel(task.target)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar
                            className={cn(
                              "h-4 w-4",
                              overdue ? "text-destructive" : "text-muted-foreground",
                            )}
                          />
                          <span
                            className={
                              overdue
                                ? "font-semibold text-destructive"
                                : "font-medium text-foreground/75"
                            }
                          >
                            {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        {progress ? (
                          <span className="task-vivid-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
                            <ListChecks className="h-3.5 w-3.5" />
                            {progress.done}/{progress.total}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-56">
                    <ContextMenuItem onSelect={() => onOpen(task)}>Abrir atividade</ContextMenuItem>
                    {onReorder && permissions.canMove && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onSelect={() => {
                            const first = tasks.find((item) => item.id !== task.id);
                            onReorder(task, first?.id ?? null);
                          }}
                        >
                          Mover para o início
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => onReorder(task, null)}>
                          Mover para o final
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        <AnimatePresence initial={false}>
          {tasks.map((task, index) => {
            const emp = getEmployee(task.responsibleId);
            const overdue = isOverdue(task);
            const permissions = permissionsByTaskId.get(task.id)!;
            const progress = subtaskProgress(task);
            const isMobileDragging = mobileDrag?.taskId === task.id;
            const isMobileDropTarget = mobileDrag?.hasMoved && mobileDrag.beforeTaskId === task.id;
            return (
              <motion.div
                key={task.id}
                data-mobile-task-id={task.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={
                  isMobileDragging
                    ? {
                        opacity: 0.92,
                        x: mobileDrag.deltaX,
                        y: mobileDrag.deltaY,
                        scale: 1.02,
                      }
                    : movingTaskId === task.id
                      ? { opacity: 0.28, x: 34, scale: 0.97 }
                      : { opacity: 1, x: 0, y: 0, scale: 1 }
                }
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                whileTap={{ scale: 0.992 }}
                transition={{
                  duration: isMobileDragging ? 0 : 0.34,
                  delay:
                    isMobileDragging || tasks.length > MOBILE_STAGGER_TASK_LIMIT
                      ? 0
                      : Math.min(index * 0.018, 0.09),
                  ease: [0.22, 1, 0.36, 1],
                  layout: { type: "spring", stiffness: 280, damping: 32, mass: 0.9 },
                }}
                role="button"
                tabIndex={0}
                aria-label={
                  onReorder && permissions.canMove
                    ? `Abrir atividade ${task.title}. Segure para reorganizar.`
                    : `Abrir atividade ${task.title}`
                }
                onPointerDown={(event) => {
                  if (permissions.canMove) startMobileDrag(event, task);
                }}
                onPointerMove={moveMobileDrag}
                onPointerUp={(event) => finishMobileDrag(event, true)}
                onPointerCancel={(event) => finishMobileDrag(event, false)}
                onLostPointerCapture={(event) => finishMobileDrag(event, false)}
                onContextMenu={(event) => {
                  if (onReorder && permissions.canMove) event.preventDefault();
                }}
                onClick={() => {
                  if (Date.now() >= ignoreMobileClickUntilRef.current) onOpen(task);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(task);
                  }
                }}
                className={cn(
                  "pressable group relative flex cursor-pointer items-start gap-3 rounded-[20px] border border-border/60 bg-card/65 p-4 shadow-none outline-none backdrop-blur-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary/20",
                  onReorder &&
                    permissions.canMove &&
                    "touch-pan-y select-none [-webkit-touch-callout:none]",
                  overdue && "border-destructive/20 bg-destructive/[0.055]",
                  selectedTaskId === task.id && "border-primary/25 bg-primary/[0.075]",
                  isMobileDragging &&
                    "z-50 cursor-grabbing border-primary/45 bg-card shadow-[0_18px_50px_-18px_color-mix(in_oklab,var(--primary)_48%,transparent)]",
                )}
              >
                {isMobileDropTarget && (
                  <span
                    className="pointer-events-none absolute -top-2.5 left-3 right-3 h-1 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_12%,transparent)]"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!permissions.canChangeStatus || isCompleting || celebratingTaskId !== null)
                      return;
                    completeFromMobile(task);
                  }}
                  disabled={
                    !permissions.canChangeStatus || isCompleting || celebratingTaskId !== null
                  }
                  className={cn(
                    "task-mobile-complete relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-visible rounded-full transition-all disabled:opacity-50",
                    celebratingTaskId === task.id
                      ? "task-mobile-complete-active bg-success text-white"
                      : overdue
                        ? "bg-destructive text-destructive-foreground shadow-sm"
                        : "bg-primary/10 text-primary",
                  )}
                  aria-label="Concluir tarefa"
                >
                  {celebratingTaskId === task.id && (
                    <span className="task-complete-burst" aria-hidden="true">
                      {Array.from({ length: 6 }, (_, particleIndex) => (
                        <span key={particleIndex} />
                      ))}
                    </span>
                  )}
                  <Check
                    className={cn(
                      "h-4 w-4 opacity-65 transition",
                      celebratingTaskId === task.id && "task-complete-check opacity-100",
                    )}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {task.title}
                  </h3>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    {overdue && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Atrasada
                      </span>
                    )}
                    {progress && (
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <ListChecks className="h-3.5 w-3.5" />
                        {progress.done}/{progress.total}
                      </span>
                    )}
                    {task.comments > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {task.comments}
                      </span>
                    )}
                    {task.attachments > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {task.attachments}
                      </span>
                    )}
                  </div>
                </div>

                {showResponsible && task.target.type !== "user" && (
                  <div
                    className="shrink-0"
                    title={
                      emp?.name ??
                      (task.target.type === "department" ? "Setor inteiro" : "Sem responsável")
                    }
                  >
                    <EmployeeAvatar employee={emp} departments={departments} />
                  </div>
                )}

                {onReorder && permissions.canMove && (
                  <span
                    className="-mr-2 -mt-1 flex h-10 w-7 shrink-0 items-center justify-center text-primary/45"
                    aria-hidden="true"
                  >
                    <GripVertical className="h-5 w-5" />
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {mobileDrag?.hasMoved && mobileDrag.beforeTaskId === null && (
          <div
            className="mx-3 -mt-1 h-1 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_12%,transparent)]"
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );
}

export const TaskList = memo(TaskListImpl);
