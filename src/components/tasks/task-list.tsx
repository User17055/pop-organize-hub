import { Calendar, Check, ListChecks, MessageSquare, Paperclip } from "lucide-react";
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
import type { CurrentUser, Department, Employee, Group, Task } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { EmployeeAvatar } from "./employee-avatar";
import { isOverdue } from "./task-form-types";

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
  currentUser,
  selectedTaskId,
  onOpen,
  onComplete,
  isCompleting,
}: {
  tasks: Task[];
  employees: Employee[];
  departments: Department[];
  groups: Group[];
  currentUser: CurrentUser;
  selectedTaskId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  isCompleting: boolean;
}) {
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);

  return (
    <>
      {/* Desktop dense table */}
      <div className="hidden md:block rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const emp = getEmployee(task.responsibleId);
              const overdue = isOverdue(task);
              const permissions = getTaskPermissions({
                task,
                currentUser,
                employees,
                departments,
                groups,
              });
              const progress = subtaskProgress(task);
              return (
                <TableRow
                  key={task.id}
                  onClick={() => onOpen(task)}
                  className={cn(
                    "cursor-pointer",
                    overdue && "bg-destructive/[0.03]",
                    selectedTaskId === task.id && "bg-primary/5",
                  )}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!permissions.canChangeStatus || isCompleting) return;
                        onComplete(task);
                      }}
                      disabled={!permissions.canChangeStatus || isCompleting}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition disabled:opacity-40",
                        overdue
                          ? "border-destructive/50 text-destructive hover:border-destructive"
                          : "border-muted-foreground/30 text-primary hover:border-primary",
                      )}
                      aria-label="Concluir tarefa"
                    >
                      <Check className="h-3 w-3 opacity-0 hover:opacity-100 transition" />
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div
                      className="truncate font-medium text-sm text-foreground"
                      title={task.title}
                    >
                      {task.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {task.comments > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {task.comments}
                        </span>
                      )}
                      {task.attachments > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> {task.attachments}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar employee={emp} departments={departments} size="sm" />
                      <span className="text-xs text-foreground/80 truncate max-w-[120px]">
                        {emp?.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
                      {task.target.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span
                        className={
                          overdue ? "font-semibold text-destructive" : "text-foreground/80"
                        }
                      >
                        {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    {progress ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        {progress.done}/{progress.total}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {tasks.map((task) => {
          const emp = getEmployee(task.responsibleId);
          const overdue = isOverdue(task);
          const permissions = getTaskPermissions({
            task,
            currentUser,
            employees,
            departments,
            groups,
          });
          const progress = subtaskProgress(task);
          return (
            <div
              key={task.id}
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
                "group flex items-center gap-3 cursor-pointer bg-card border rounded-md p-3.5 transition-all outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15",
                overdue ? "border-destructive/40 bg-destructive/[0.03]" : "border-border",
                selectedTaskId === task.id && "border-primary/60 ring-1 ring-primary/10",
              )}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!permissions.canChangeStatus || isCompleting) return;
                  onComplete(task);
                }}
                disabled={!permissions.canChangeStatus || isCompleting}
                className={cn(
                  "shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition disabled:opacity-40",
                  overdue
                    ? "border-destructive/50 text-destructive hover:border-destructive"
                    : "border-muted-foreground/30 text-primary hover:border-primary",
                )}
                aria-label="Concluir tarefa"
              >
                <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {task.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <PriorityBadge priority={task.priority} />
                  {overdue && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive font-semibold">
                      Atrasada
                    </span>
                  )}
                  {progress && (
                    <span className="inline-flex items-center gap-1">
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

              <EmployeeAvatar employee={emp} departments={departments} />
            </div>
          );
        })}
      </div>
    </>
  );
}
