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

export function MonthGrid({
  month,
  tasksByDay,
  selectedDay,
  onSelectDay,
}: {
  month: Date;
  tasksByDay: Map<string, Task[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const visibleTasks = dayTasks.slice(0, 3);
          const overflow = dayTasks.length - visibleTasks.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "min-h-[52px] sm:min-h-[92px] border-b border-r border-border/70 p-1.5 sm:p-2 text-left align-top transition-colors hover:bg-muted/40 last:border-r-0",
                !inMonth && "bg-muted/20 text-muted-foreground/60",
                selected && "ring-2 ring-inset ring-primary/50 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold",
                  today ? "bg-primary text-primary-foreground" : "text-foreground",
                  !inMonth && "text-muted-foreground/50",
                )}
              >
                {format(day, "d", { locale: ptBR })}
              </span>

              {/* Mobile: dots only */}
              {dayTasks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {dayTasks.slice(0, 4).map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        priorityDotClass[task.priority],
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Desktop/tablet: dot + truncated title */}
              <div className="mt-1.5 hidden space-y-1 sm:block">
                {visibleTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-1.5 truncate text-[11px] text-foreground/80"
                    title={task.title}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        priorityDotClass[task.priority],
                      )}
                    />
                    <span className="truncate">{task.title}</span>
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
