import { Calendar, Check, ListChecks, MessageSquare, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { CurrentUser, Department, Employee, Group, PermissionGroup, Task } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { EmployeeAvatar } from "./employee-avatar";
import { isOverdue, taskTargetLabel } from "./task-form-types";

function subtaskProgress(task: Task) {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) return null;
  return { done: subtasks.filter((item) => item.done).length, total: subtasks.length };
}

export function TaskList({
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
  onMove,
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
  onMove?: (task: Task, target: { type: "department" | "group"; id: string }) => void;
  isCompleting: boolean;
  preferences?: {
    titleWidth: number;
    density: "compact" | "comfortable";
    showDescription: boolean;
  };
  onTitleWidthChange?: (width: number) => void;
}) {
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
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

  useEffect(
    () => () => {
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    },
    [],
  );

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
                Título
                {onTitleWidthChange && (
                  <button
                    type="button"
                    onPointerDown={startTitleResize}
                    className="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none rounded-full transition hover:bg-primary/25"
                    aria-label="Ajustar largura da coluna de atividade"
                  />
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
              const permissions = getTaskPermissions({
                task,
                currentUser,
                employees,
                departments,
                groups,
                permissionGroups,
              });
              const progress = subtaskProgress(task);
              return (
                <ContextMenu key={task.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      onClick={() => onOpen(task)}
                      className={cn(
                        "task-glass-row group cursor-pointer border-0 transition-all duration-300 hover:text-foreground",
                        tablePreferences.density === "compact" && "[&_td]:!py-2.5",
                        overdue && "bg-destructive/[0.05] hover:bg-destructive/[0.08]",
                        selectedTaskId === task.id && "task-row-selected",
                      )}
                    >
                      <TableCell className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
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
                    {onMove && permissions.canEditContent && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuLabel>Mover atividade</ContextMenuLabel>
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>Para um grupo</ContextMenuSubTrigger>
                          <ContextMenuSubContent className="min-w-52">
                            {groups.map((group) => (
                              <ContextMenuItem
                                key={group.id}
                                onSelect={() => onMove(task, { type: "group", id: group.id })}
                              >
                                {group.name}
                              </ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>Para um setor</ContextMenuSubTrigger>
                          <ContextMenuSubContent className="min-w-52">
                            {departments.map((department) => (
                              <ContextMenuItem
                                key={department.id}
                                onSelect={() =>
                                  onMove(task, { type: "department", id: department.id })
                                }
                              >
                                {department.name}
                              </ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
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
        {tasks.map((task, index) => {
          const emp = getEmployee(task.responsibleId);
          const overdue = isOverdue(task);
          const permissions = getTaskPermissions({
            task,
            currentUser,
            employees,
            departments,
            groups,
            permissionGroups,
          });
          const progress = subtaskProgress(task);
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              whileTap={{ scale: 0.992 }}
              transition={{
                duration: 0.34,
                delay: Math.min(index * 0.018, 0.09),
                ease: [0.22, 1, 0.36, 1],
                layout: { type: "spring", stiffness: 280, damping: 32, mass: 0.9 },
              }}
              role="button"
              tabIndex={0}
              aria-label={`Abrir atividade ${task.title}`}
              onClick={() => onOpen(task)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(task);
                }
              }}
              className={cn(
                "pressable group flex cursor-pointer items-start gap-3 rounded-[20px] border border-border/60 bg-card/65 p-4 shadow-none outline-none backdrop-blur-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary/20",
                overdue && "border-destructive/20 bg-destructive/[0.055]",
                selectedTaskId === task.id && "border-primary/25 bg-primary/[0.075]",
              )}
            >
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
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
