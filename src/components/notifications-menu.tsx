import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/domain";

export const PENDING_TASK_KEY = "pop-organize:open-task";

type NotificationTone = "destructive" | "warning" | "primary";

type NotificationItem = {
  id: string;
  taskId: string;
  tone: NotificationTone;
  title: string;
  description: string;
};

const toneStyles: Record<NotificationTone, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
  primary: "bg-primary/10 text-primary",
};

const toneIcon: Record<NotificationTone, typeof AlertTriangle> = {
  destructive: AlertTriangle,
  warning: CalendarClock,
  primary: ShieldCheck,
};

const toneRank: Record<NotificationTone, number> = { destructive: 0, warning: 1, primary: 2 };

function computeNotifications(tasks: Task[], currentUserId?: string): NotificationItem[] {
  if (!currentUserId) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soonThreshold = today.getTime() + 2 * 86_400_000;

  const items: NotificationItem[] = [];
  for (const task of tasks) {
    if (task.status === "completed" || task.status === "canceled") continue;
    const due = new Date(`${task.dueDate}T00:00:00`).getTime();
    const isMine = task.responsibleId === currentUserId;
    const isReviewer = task.reviewerId === currentUserId;

    if (isMine && task.status === "reopened") {
      items.push({
        id: `reopened-${task.id}`,
        taskId: task.id,
        tone: "destructive",
        title: "Tarefa reaberta",
        description: task.title,
      });
    } else if (isMine && due < today.getTime()) {
      items.push({
        id: `overdue-${task.id}`,
        taskId: task.id,
        tone: "destructive",
        title: "Tarefa atrasada",
        description: task.title,
      });
    } else if (isMine && due <= soonThreshold) {
      items.push({
        id: `soon-${task.id}`,
        taskId: task.id,
        tone: "warning",
        title: "Vencendo em breve",
        description: task.title,
      });
    }

    if (isReviewer && task.status === "waiting_review") {
      items.push({
        id: `review-${task.id}`,
        taskId: task.id,
        tone: "primary",
        title: "Aguardando sua revisão",
        description: task.title,
      });
    }
  }

  return items.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]);
}

export function NotificationsMenu({
  tasks,
  currentUserId,
}: {
  tasks: Task[];
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const notifications = useMemo(
    () => computeNotifications(tasks, currentUserId),
    [tasks, currentUserId],
  );

  function openTask(taskId: string) {
    sessionStorage.setItem(PENDING_TASK_KEY, taskId);
    setOpen(false);
    navigate({ to: "/tarefas" });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-9 w-9 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-4.5 w-4.5 text-foreground/70" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-pulse">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notificações</span>
          <span className="text-xs text-muted-foreground">{notifications.length} no total</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Tudo em dia por aqui.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const Icon = toneIcon[item.tone];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openTask(item.taskId)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-b border-border/60 last:border-b-0"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      toneStyles[item.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
