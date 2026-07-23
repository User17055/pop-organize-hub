import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/domain";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const priorityDotClass: Record<Task["priority"], string> = {
  low: "bg-muted-foreground/50",
  medium: "bg-primary",
  high: "bg-warning",
  urgent: "bg-destructive",
};

function balancedCalendarTasks(tasks: Task[]) {
  const completed = tasks.filter(
    (task) => task.status === "completed" || task.status === "waiting_review",
  );
  const pending = tasks.filter(
    (task) => task.status !== "completed" && task.status !== "waiting_review",
  );
  if (completed.length === 0 || pending.length === 0) return tasks;

  const balanced: Task[] = [];
  const length = Math.max(pending.length, completed.length);
  for (let index = 0; index < length; index += 1) {
    if (pending[index]) balanced.push(pending[index]);
    if (completed[index]) balanced.push(completed[index]);
  }
  return balanced;
}

export function MonthGrid({
  month,
  tasksByDay,
  selectedDay,
  onSelectDay,
  fullHeight = false,
}: {
  month: Date;
  tasksByDay: Map<string, Task[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
  fullHeight?: boolean;
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div
      className={cn(
        "task-glass-panel overflow-hidden rounded-[22px] p-2 md:rounded-[24px] md:p-3",
        fullHeight && "md:flex md:h-full md:min-h-0 md:flex-col",
      )}
    >
      <div className="grid grid-cols-7 px-1 pb-2">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground/75 md:px-2 md:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "grid grid-cols-7 gap-1.5 md:gap-2",
          fullHeight && "md:flex-1 md:auto-rows-fr",
        )}
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const balancedTasks = balancedCalendarTasks(dayTasks);
          const visibleTasks = balancedTasks.slice(0, 3);
          const mobileVisibleTasks = balancedTasks.slice(0, 4);
          const overflow = dayTasks.length - visibleTasks.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "pressable flex min-h-[66px] flex-col rounded-[15px] border border-border/45 bg-background/62 p-1.5 text-left align-top outline-none hover:border-primary/24 hover:bg-background/90 focus-visible:ring-2 focus-visible:ring-primary/20 sm:min-h-[112px] sm:rounded-[18px] sm:p-2.5",
                fullHeight && "sm:min-h-0",
                !inMonth && "bg-muted/24 text-muted-foreground/55",
                selected && "border-primary/30 bg-primary/8 ring-2 ring-inset ring-primary/18",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs",
                    today ? "bg-foreground text-background" : "text-foreground",
                    !inMonth && "text-muted-foreground/50",
                  )}
                >
                  {format(day, "d", { locale: ptBR })}
                </span>
              </div>

              {/* Mobile: dots only */}
              {dayTasks.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-0.5 sm:hidden">
                  {mobileVisibleTasks.map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        "h-1.5 w-2.5 shrink-0 rounded-full",
                        task.status === "completed" || task.status === "waiting_review"
                          ? "bg-emerald-500"
                          : priorityDotClass[task.priority],
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Desktop/tablet: dot + truncated title */}
              <div className="mt-2 hidden min-h-0 flex-1 space-y-1.5 sm:block">
                {visibleTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-full border border-border/50 bg-white/68 px-2 py-1 text-[11px] font-medium text-foreground/72"
                    title={task.title}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          task.status === "completed" || task.status === "waiting_review"
                            ? "bg-emerald-500"
                            : priorityDotClass[task.priority],
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[11px] font-medium text-muted-foreground">
                    +{overflow} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
