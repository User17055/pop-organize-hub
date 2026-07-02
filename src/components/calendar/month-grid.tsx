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
        "mobile-card overflow-hidden rounded-[28px] md:rounded-[26px]",
        fullHeight && "flex h-full min-h-[620px] flex-col md:min-h-0",
      )}
    >
      <div className="grid grid-cols-7 border-b border-white/70 bg-white/55">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground md:px-2 md:py-3 md:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "grid grid-cols-7 gap-px bg-border/35 p-px",
          fullHeight && "flex-1 auto-rows-fr",
        )}
      >
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
                "pressable flex min-h-[72px] flex-col rounded-[18px] bg-white/68 p-1.5 text-left align-top outline-none hover:bg-white/95 focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-h-[112px] sm:p-2.5",
                fullHeight && "sm:min-h-0",
                !inMonth && "bg-white/38 text-muted-foreground/60",
                selected && "bg-primary/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_40%,transparent)] ring-2 ring-inset ring-primary/35",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 sm:text-xs",
                    today ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-foreground",
                    !inMonth && "text-muted-foreground/50",
                  )}
                >
                  {format(day, "d", { locale: ptBR })}
                </span>
                {dayTasks.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary sm:hidden">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              {/* Mobile: dots only */}
              {dayTasks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                  {dayTasks.slice(0, 4).map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        "h-1.5 w-3 shrink-0 rounded-full",
                        priorityDotClass[task.priority],
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
                    className="rounded-full bg-white/70 px-2 py-1 text-[11px] text-foreground/80 shadow-[0_1px_0_oklch(1_0_0/0.65)_inset]"
                    title={task.title}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          priorityDotClass[task.priority],
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
