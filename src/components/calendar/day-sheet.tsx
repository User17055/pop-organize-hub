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
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border text-left">
          <SheetTitle>{day ? format(day, "d 'de' MMMM", { locale: ptBR }) : ""}</SheetTitle>
          <SheetDescription>
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"} com vencimento neste dia
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground px-1 py-6 text-center">
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
                className="w-full flex items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
              >
                <EmployeeAvatar employee={emp} departments={departments} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{emp?.name}</span>
                    {subtasks.length > 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <ListChecks className="h-3 w-3" />
                        {subtasks.filter((item) => item.done).length}/{subtasks.length}
                      </span>
                    )}
                    {task.comments > 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <MessageSquare className="h-3 w-3" /> {task.comments}
                      </span>
                    )}
                    {task.attachments > 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0">
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
