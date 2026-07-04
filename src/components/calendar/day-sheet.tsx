import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListChecks, MessageSquare, Paperclip } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PriorityBadge, StatusBadge } from "@/components/app-shell";
import { EmployeeAvatar } from "@/components/tasks/employee-avatar";
import type { Department, Employee, Task } from "@/lib/domain";

export function DaySheet({
  day,
  tasks,
  employees,
  departments,
  onOpenChange,
  onOpenTask,
}: {
  day: Date | null;
  tasks: Task[];
  employees: Employee[];
  departments: Department[];
  onOpenChange: (open: boolean) => void;
  onOpenTask: (task: Task) => void;
}) {
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);

  return (
    <Sheet open={day !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="safe-bottom-bar flex max-h-[78vh] flex-col gap-0 rounded-t-[28px] border-white/70 bg-white/94 p-0 backdrop-blur-2xl sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
      >
        <SheetHeader className="border-b border-border/55 px-5 pb-4 pt-5 text-left">
          <SheetTitle className="font-display text-xl font-bold">
            {day ? format(day, "d 'de' MMMM", { locale: ptBR }) : ""}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"} com vencimento neste dia
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {tasks.length === 0 && (
            <p className="task-glass-panel rounded-[22px] px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa vence neste dia.
            </p>
          )}
          {tasks.map((task) => {
            const emp = getEmployee(task.responsibleId);
            const subtasks = task.subtasks ?? [];
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                className="task-glass-panel pressable flex w-full items-start gap-3 rounded-[22px] p-4 text-left hover:border-primary/30"
              >
                <EmployeeAvatar employee={emp} departments={departments} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{task.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{emp?.name}</span>
                    {subtasks.length > 0 && (
                      <span className="task-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1">
                        <ListChecks className="h-3 w-3" />
                        {subtasks.filter((item) => item.done).length}/{subtasks.length}
                      </span>
                    )}
                    {task.comments > 0 && (
                      <span className="task-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1">
                        <MessageSquare className="h-3 w-3" /> {task.comments}
                      </span>
                    )}
                    {task.attachments > 0 && (
                      <span className="task-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1">
                        <Paperclip className="h-3 w-3" /> {task.attachments}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
