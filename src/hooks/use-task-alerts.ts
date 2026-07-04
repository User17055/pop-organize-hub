import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PENDING_TASK_KEY } from "@/components/notifications-menu";
import type { Task } from "@/lib/domain";

const SEEN_KEY_PREFIX = "pop-organize:seen-tasks:";
const OVERDUE_KEY_PREFIX = "pop-organize:overdue-alert:";

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readSeen(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return null;
  }
}

function writeSeen(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, JSON.stringify([...ids]));
  } catch {
    // storage indisponível (modo privado etc.) — só não persiste
  }
}

/**
 * Popups in-app (funcionam no navegador e dentro do app Android/iOS via Capacitor):
 * - avisa quando uma nova tarefa é atribuída ao usuário;
 * - avisa uma vez por dia quando há tarefas atrasadas do usuário.
 */
export function useTaskAlerts(tasks: Task[] | undefined, currentUserId: string | undefined) {
  const navigate = useNavigate();
  const checkedOverdueRef = useRef(false);

  useEffect(() => {
    if (!tasks || !currentUserId || typeof window === "undefined") return;

    const openTask = (taskId: string) => {
      sessionStorage.setItem(PENDING_TASK_KEY, taskId);
      navigate({ to: "/tarefas" });
    };

    const myOpenTasks = tasks.filter(
      (task) =>
        task.responsibleId === currentUserId &&
        task.status !== "completed" &&
        task.status !== "canceled",
    );

    // --- Nova tarefa atribuída ---
    const seen = readSeen(currentUserId);
    const currentIds = new Set(myOpenTasks.map((task) => task.id));
    if (seen === null) {
      // Primeira visita neste dispositivo: registra o estado atual sem alardear.
      writeSeen(currentUserId, currentIds);
    } else {
      const fresh = myOpenTasks.filter((task) => !seen.has(task.id));
      for (const task of fresh.slice(0, 3)) {
        toast.info("Nova tarefa para você", {
          description: task.title,
          action: { label: "Abrir", onClick: () => openTask(task.id) },
          duration: 8000,
        });
      }
      if (fresh.length > 0) {
        writeSeen(currentUserId, new Set([...seen, ...currentIds]));
      }
    }

    // --- Tarefas atrasadas (uma vez por dia por dispositivo) ---
    if (!checkedOverdueRef.current) {
      checkedOverdueRef.current = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = myOpenTasks.filter((task) => new Date(`${task.dueDate}T00:00:00`) < today);
      const overdueKey = `${OVERDUE_KEY_PREFIX}${currentUserId}:${todayStamp()}`;
      if (overdue.length > 0 && !sessionStorage.getItem(overdueKey)) {
        sessionStorage.setItem(overdueKey, "1");
        toast.warning(
          overdue.length === 1
            ? "Você tem 1 tarefa atrasada"
            : `Você tem ${overdue.length} tarefas atrasadas`,
          {
            description: overdue[0].title + (overdue.length > 1 ? " e outras..." : ""),
            action: { label: "Ver", onClick: () => openTask(overdue[0].id) },
            duration: 10000,
          },
        );
      }
    }
  }, [tasks, currentUserId, navigate]);
}
