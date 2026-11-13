import type { Task, TaskStatus } from "./domain";

/** Completion identity comes from the authenticated actor, never from an assignee or device. */
export function setTaskStatus(
  task: Pick<Task, "status" | "completedById" | "completedByName" | "completedAt">,
  status: TaskStatus,
  actor: { id: string; name: string },
  now = new Date().toISOString(),
) {
  if (status === "completed" && task.status !== "completed") {
    task.completedById = actor.id;
    task.completedByName = actor.name;
    task.completedAt = now;
  } else if (status !== "completed") {
    delete task.completedById;
    delete task.completedByName;
    delete task.completedAt;
  }
  task.status = status;
}
