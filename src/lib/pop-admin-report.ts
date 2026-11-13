import { z } from "zod";
import type { Database } from "./database";

export const popIndicatorsSchema = z.object({
  metric: z.enum(["overview", "overdue_by_department", "completed_by_person"]),
  fromDate: z.string().nullable(),
  toDate: z.string().nullable(),
});
export const popStructureSchema = z.object({
  kind: z.enum(["overview", "employees", "departments", "groups", "permissions", "invitations"]),
  query: z.string(),
  limit: z.number().int().min(1).max(50),
});
export function popAdminIndicators(workspace: Database, raw: unknown, today: string) {
  const input = popIndicatorsSchema.parse(raw);
  const inPeriod = (date: string) =>
    Boolean(date) &&
    (!input.fromDate || date >= input.fromDate) &&
    (!input.toDate || date <= input.toDate);
  const active = workspace.tasks.filter((task) => !["completed", "canceled"].includes(task.status));
  const overdue = active.filter((task) => task.dueDate < today && inPeriod(task.dueDate));
  const sectorCounts = new Map<string, number>();
  for (const task of overdue) {
    const ids =
      task.target.type === "department"
        ? [task.target.id]
        : [
            ...new Set(
              workspace.employees
                .filter((person) =>
                  [
                    task.responsibleId,
                    ...(task.responsibleIds ?? []),
                    ...(task.target.type === "user" ? [task.target.id] : []),
                  ].includes(person.id),
                )
                .map((person) => person.departmentId)
                .filter(Boolean),
            ),
          ];
    for (const id of ids.length ? ids : ["__shared"])
      sectorCounts.set(id, (sectorCounts.get(id) ?? 0) + 1);
  }
  const completed = workspace.tasks.filter((task) => task.status === "completed");
  const ranked = new Map<string, { id: string; name: string; count: number }>();
  let unknownActor = 0,
    unknownDate = 0;
  for (const task of completed) {
    let completionDate = "";
    if (task.completedAt && !Number.isNaN(Date.parse(task.completedAt)))
      completionDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
        new Date(task.completedAt),
      );
    if (!completionDate) unknownDate++;
    if ((input.fromDate || input.toDate) && !inPeriod(completionDate)) continue;
    if (!task.completedById) {
      unknownActor++;
      continue;
    }
    const entry = ranked.get(task.completedById) ?? {
      id: task.completedById,
      name:
        task.completedByName ||
        workspace.employees.find((person) => person.id === task.completedById)?.name ||
        "Colaborador não identificado",
      count: 0,
    };
    entry.count++;
    ranked.set(entry.id, entry);
  }
  return {
    company: workspace.company.name,
    today,
    period: { from: input.fromDate, to: input.toDate },
    overview: {
      total: workspace.tasks.length,
      open: active.length,
      dueToday: active.filter((task) => task.dueDate === today).length,
      overdue: overdue.length,
      waitingReview: active.filter((task) => task.status === "waiting_review").length,
      completed: [...ranked.values()].reduce((sum, item) => sum + item.count, 0) + unknownActor,
      canceled: workspace.tasks.filter((task) => task.status === "canceled").length,
    },
    overdueByDepartment: [...sectorCounts]
      .map(([id, count]) => ({
        id,
        name:
          workspace.departments.find((department) => department.id === id)?.name ??
          "Compartilhadas / sem setor definido",
        count,
      }))
      .sort((a, b) => b.count - a.count),
    completedByPerson: [...ranked.values()].sort((a, b) => b.count - a.count),
    unknownCompletionActor: unknownActor,
    unknownCompletionDate: unknownDate,
    methodology:
      "Atrasadas: data anterior a hoje e status aberto; tarefas compartilhadas entre setores contam em cada setor envolvido. Conclusões: autoria completedById, nunca presumida pelo responsável. Registros antigos sem autoria ficam separados. Contagem de conclusões não mede produtividade.",
  };
}

export function popAdminStructure(workspace: Database, raw: unknown) {
  const input = popStructureSchema.parse(raw);
  const matches = (value: string) =>
    value.toLocaleLowerCase("pt-BR").includes(input.query.toLocaleLowerCase("pt-BR"));
  const name = (id?: string) =>
    workspace.employees.find((person) => person.id === id)?.name ?? "Não definido";
  const select = (items: Array<Record<string, unknown>>) => ({
    total: items.length,
    items: items.slice(0, input.limit),
  });
  if (input.kind === "employees")
    return select(
      workspace.employees
        .filter((person) => matches(person.name + " " + person.email))
        .map((person) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          role: person.role,
          status: person.status,
          department: workspace.departments.find((item) => item.id === person.departmentId)?.name,
          permissionGroup: workspace.permissionGroups.find(
            (group) => group.id === person.permissionGroupId,
          )?.name,
        })),
    );
  if (input.kind === "departments")
    return select(
      workspace.departments
        .filter((item) => matches(item.name))
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          manager: name(item.managerId),
          members: workspace.employees
            .filter((person) => person.departmentId === item.id)
            .map((person) => person.name),
        })),
    );
  if (input.kind === "groups")
    return select(
      workspace.groups
        .filter((item) => matches(item.name))
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          leader: name(item.leaderId),
          members: item.memberIds.map(name),
        })),
    );
  if (input.kind === "permissions")
    return select(
      workspace.permissionGroups
        .filter((item) => matches(item.name))
        .map((item) => ({
          id: item.id,
          name: item.name,
          permissions: item.permissions,
          members: workspace.employees
            .filter((person) => person.permissionGroupId === item.id)
            .map((person) => person.name),
        })),
    );
  if (input.kind === "invitations")
    return select(
      workspace.invitations
        .filter((item) => matches(item.name + " " + item.email))
        .map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          role: item.role,
          status: item.status,
          expiresAt: item.expiresAt,
        })),
    );
  return {
    company: { name: workspace.company.name },
    employees: workspace.employees.length,
    activeEmployees: workspace.employees.filter((person) => person.status === "active").length,
    departments: workspace.departments.length,
    groups: workspace.groups.length,
    permissionGroups: workspace.permissionGroups.length,
    invitations: workspace.invitations.length,
  };
}
