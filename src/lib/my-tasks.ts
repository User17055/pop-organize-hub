import type { Department, Employee, Group, Task } from "./domain";

/** De onde a tarefa veio: o destino estrutural dela. */
export type MyTaskOrigin = "individual" | "department" | "group" | "company";

/** Por que a tarefa é da pessoa. */
export type MyTaskReason = "responsible" | "member" | "review";

export type MyTaskLink = {
  origin: MyTaskOrigin;
  reason: MyTaskReason;
  /** Nome do setor, do grupo ou da empresa; vazio na tarefa individual. */
  originName: string;
};

type MyTaskContext = {
  employees: Array<Pick<Employee, "id" | "departmentId">>;
  departments: Array<Pick<Department, "id" | "memberIds">>;
  groups: Array<Pick<Group, "id" | "leaderId" | "memberIds">>;
  /** Quem revisa a tarefa, como `getTaskPermissions` calcula (`reviewManagerId`). */
  reviewManagerId?: string;
};

function originOf(task: Task): Pick<MyTaskLink, "origin" | "originName"> {
  if (task.target.type === "user") return { origin: "individual", originName: "" };
  return { origin: task.target.type, originName: task.target.label };
}

/**
 * Diz se a tarefa é da pessoa e por quê, para a visão "Minhas tarefas".
 *
 * Segue a régua de quem trabalha na tarefa em `canViewTask`, sem os acessos de quem só supervisiona
 * (administrador, `tasks.viewAll`, gestor de setor, criador): eles enxergam a tarefa, mas ela não é
 * deles. Tarefa com responsável definido é só dos responsáveis; sem responsável, é de quem está no
 * destino (a pessoa, o setor, o grupo ou a empresa inteira). Quem revisa entra enquanto a tarefa
 * espera a revisão.
 */
export function getMyTaskLink(
  task: Task,
  userId: string | undefined,
  context: MyTaskContext,
): MyTaskLink | null {
  if (!userId) return null;
  const origin = originOf(task);
  const responsibleIds = new Set(
    [task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean),
  );

  if (responsibleIds.has(userId)) return { ...origin, reason: "responsible" };
  if (task.target.type === "user" && task.target.id === userId) {
    return { ...origin, reason: "responsible" };
  }
  if (task.status === "waiting_review" && context.reviewManagerId === userId) {
    return { ...origin, reason: "review" };
  }
  if (responsibleIds.size > 0) return null;

  if (task.target.type === "company") return { ...origin, reason: "member" };
  if (task.target.type === "department") {
    const employee = context.employees.find((item) => item.id === userId);
    const department = context.departments.find((item) => item.id === task.target.id);
    const isMember =
      employee?.departmentId === task.target.id || Boolean(department?.memberIds?.includes(userId));
    return isMember ? { ...origin, reason: "member" } : null;
  }
  if (task.target.type === "group") {
    const group = context.groups.find((item) => item.id === task.target.id);
    const isMember = group?.leaderId === userId || Boolean(group?.memberIds.includes(userId));
    return isMember ? { ...origin, reason: "member" } : null;
  }
  return null;
}

export const myTaskOriginLabels: Record<MyTaskOrigin, string> = {
  individual: "Individual",
  department: "Setor",
  group: "Grupo",
  company: "Empresa",
};
