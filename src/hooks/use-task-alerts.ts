import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PENDING_TASK_KEY } from "@/components/notifications-menu";
import type { Employee, Task } from "@/lib/domain";

const SEEN_KEY_PREFIX = "pop-organize:seen-tasks:";
const OVERDUE_KEY_PREFIX = "pop-organize:overdue-alert:";

function assignmentNotificationTitle(task: Task, currentUserId: string, assignedBy?: string) {
  const author = assignedBy || "Alguém";
  const isOtherAuthor = Boolean(task.assignedById && task.assignedById !== currentUserId);

  switch (task.target.type) {
    case "department":
      return `${isOtherAuthor ? author : "Nova tarefa"} ${
        isOtherAuthor ? "atribuiu uma tarefa ao" : "no"
      } setor ${task.target.label}`;
    case "group":
      return `${isOtherAuthor ? author : "Nova tarefa"} ${
        isOtherAuthor ? "atribuiu uma tarefa ao" : "no"
      } grupo ${task.target.label}`;
    case "company":
      return isOtherAuthor
        ? `${author} atribuiu uma tarefa à empresa ${task.target.label}`
        : `Nova tarefa na empresa ${task.target.label}`;
    default:
      return isOtherAuthor ? `${author} colocou uma tarefa para você` : "Nova tarefa para você";
  }
}

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
 * Popups do painel web:
 * - avisa quando uma nova tarefa é atribuída ao usuário;
 * - avisa uma vez por dia quando há tarefas atrasadas do usuário.
 */
export function useTaskAlerts(
  tasks: Task[] | undefined,
  employees: Employee[] | undefined,
  currentUserId: string | undefined,
) {
  const navigate = useNavigate();
  const checkedOverdueRef = useRef(false);

  useEffect(() => {
    if (!tasks || !currentUserId || typeof window === "undefined") return;

    const openTask = (taskId: string) => {
      sessionStorage.setItem(PENDING_TASK_KEY, taskId);
      navigate({ to: "/tarefas", search: { lista: undefined } });
    };

    const myOpenTasks = tasks.filter(
      (task) =>
        (task.responsibleId === currentUserId ||
          (task.responsibleIds ?? []).includes(currentUserId)) &&
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
        const assignedBy = employees?.find((employee) => employee.id === task.assignedById)?.name;
        toast.info(assignmentNotificationTitle(task, currentUserId, assignedBy), {
          description: task.title,
          action: { label: "Ver tarefa", onClick: () => openTask(task.id) },
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
  }, [tasks, employees, currentUserId, navigate]);
}
