import type { Department, Employee, Group, Task } from "@/lib/domain";

type CalendarTaskContext = {
  departments: Department[];
  employees: Employee[];
  groups: Group[];
};

export function getCalendarTaskDepartmentIds(task: Task, context: CalendarTaskContext) {
  const ids = new Set<string>();

  if (task.target.type === "department") ids.add(task.target.id);

  const relatedEmployeeIds = new Set<string>([
    task.responsibleId,
    ...(task.responsibleIds ?? []),
    ...(task.target.type === "user" ? [task.target.id] : []),
  ]);

  if (task.target.type === "group") {
    const group = context.groups.find((item) => item.id === task.target.id);
    for (const memberId of group?.memberIds ?? []) relatedEmployeeIds.add(memberId);
  }

  for (const employeeId of relatedEmployeeIds) {
    const departmentId = context.employees.find(
      (employee) => employee.id === employeeId,
    )?.departmentId;
    if (departmentId) ids.add(departmentId);
  }

  return [...ids].filter((id) => context.departments.some((department) => department.id === id));
}

export function getCalendarTaskDepartmentLabel(task: Task, context: CalendarTaskContext) {
  const names = getCalendarTaskDepartmentIds(task, context)
    .map((id) => context.departments.find((department) => department.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  if (names.length > 0) return names.join(", ");
  if (task.target.type === "company") return "Empresa inteira";
  if (task.target.type === "group") return task.target.label;
  return "Sem setor";
}

export function getCalendarTaskTimes(task: Task) {
  const native = (
    task as Task & {
      nativeData?: { dueTime?: string; recurrenceTimes?: string[] };
    }
  ).nativeData;
  const recurrenceTimes = native?.recurrenceTimes?.length
    ? native.recurrenceTimes
    : task.recurrence?.times;
  const candidateTimes = recurrenceTimes?.length
    ? recurrenceTimes
    : native?.dueTime
      ? [native.dueTime]
      : [];

  return [...new Set(candidateTimes)]
    .filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    .sort((left, right) => left.localeCompare(right));
}

export function getCalendarTaskFirstTime(task: Task) {
  return getCalendarTaskTimes(task)[0] ?? null;
}
