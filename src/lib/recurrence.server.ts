import type { Database } from "./database";
import { nextId } from "./database";
import type { Task } from "./domain";

type RecurringNativeTask = Task & {
  nativeSource?: string;
  nativeOwnerId?: string;
  nativeData?: Record<string, unknown> & { id?: number };
  nativeRemindersByUser?: Record<string, string>;
};

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function dateString(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(value: string, amount: number) {
  const { year, month, day } = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return dateString(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function addMonths(value: string, amount: number, preferredDay?: number) {
  const { year, month, day } = dateParts(value);
  const zeroBasedMonth = month - 1 + amount;
  const nextYear = year + Math.floor(zeroBasedMonth / 12);
  const nextMonth = (((zeroBasedMonth % 12) + 12) % 12) + 1;
  const nextDay = Math.min(preferredDay ?? day, daysInMonth(nextYear, nextMonth));
  return dateString(nextYear, nextMonth, nextDay);
}

function addYears(value: string, amount: number, preferredMonth?: number, preferredDay?: number) {
  const { year, month, day } = dateParts(value);
  const nextYear = year + amount;
  const nextMonth = preferredMonth ?? month;
  const nextDay = Math.min(preferredDay ?? day, daysInMonth(nextYear, nextMonth));
  return dateString(nextYear, nextMonth, nextDay);
}

function advanceRecurringDate(date: string, recurrence: NonNullable<Task["recurrence"]>) {
  if (recurrence.frequency === "daily") return addDays(date, 1);
  if (recurrence.frequency === "weekly") return addDays(date, 7);
  if (recurrence.frequency === "biweekly") return addDays(date, 14);
  if (recurrence.frequency === "monthly") return addMonths(date, 1, recurrence.dayOfMonth);
  if (recurrence.frequency === "yearly") {
    return addYears(date, 1, recurrence.monthOfYear, recurrence.dayOfMonth);
  }
  const interval = recurrence.interval ?? recurrence.intervalDays ?? 1;
  if (recurrence.customUnit === "weeks") return addDays(date, interval * 7);
  if (recurrence.customUnit === "months") {
    return addMonths(date, interval, recurrence.dayOfMonth);
  }
  if (recurrence.customUnit === "years") {
    return addYears(date, interval, recurrence.monthOfYear, recurrence.dayOfMonth);
  }
  return addDays(date, interval);
}

function stableMobileId(taskId: string) {
  let hash = 0;
  for (let index = 0; index < taskId.length; index += 1) {
    hash = (Math.imul(31, hash) + taskId.charCodeAt(index)) | 0;
  }
  return -(Math.abs(hash) || 1);
}

function cloneOccurrence(
  workspace: Database,
  template: RecurringNativeTask,
  seriesId: string,
  dueDate: string,
  occurrence: number,
  createdAt: string,
) {
  const id = nextId("t", workspace.tasks);
  const task: RecurringNativeTask = {
    id,
    title: template.title,
    description: template.description,
    priority: template.priority,
    status: "pending",
    dueDate,
    createdAt,
    target: { ...template.target },
    responsibleId: template.responsibleId,
    responsibleIds: template.responsibleIds ? [...template.responsibleIds] : undefined,
    assignedById: template.assignedById,
    assignedAt: template.assignedAt,
    reviewerId: template.reviewerId,
    requiresReview: template.requiresReview,
    tags: [...template.tags],
    comments: 0,
    attachments: 0,
    recurrence: template.recurrence ? { ...template.recurrence } : undefined,
    recurrenceParentId: seriesId,
    recurrenceOccurrence: occurrence,
    recurrenceExcludedDates: template.recurrenceExcludedDates
      ? [...template.recurrenceExcludedDates]
      : undefined,
    subtasks: (template.subtasks ?? []).map((subtask, index) => ({
      id: `ts${index + 1}`,
      title: subtask.title,
      done: false,
      createdAt: new Date().toISOString(),
    })),
    nativeSource: template.nativeSource,
    nativeOwnerId: template.nativeOwnerId,
    nativeRemindersByUser: template.nativeRemindersByUser
      ? { ...template.nativeRemindersByUser }
      : undefined,
  };

  if (template.nativeData) {
    task.nativeData = {
      ...template.nativeData,
      id: stableMobileId(id),
      serverId: id,
      dueDate,
      dueLabel: dueDate,
      completed: false,
      recurrenceOccurrence: occurrence,
      attachmentName: "",
      checklist: (template.subtasks ?? []).map((subtask, index) => ({
        id: `ts${index + 1}`,
        title: subtask.title,
        done: false,
      })),
    };
  }

  return task;
}

export function materializeRecurringTasks(
  workspace: Database,
  currentDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date()),
) {
  const recurringTasks = workspace.tasks.filter((task) => task.recurrence) as RecurringNativeTask[];
  const series = new Map<string, RecurringNativeTask[]>();
  for (const task of recurringTasks) {
    const seriesId = task.recurrenceParentId ?? task.id;
    const tasks = series.get(seriesId) ?? [];
    tasks.push(task);
    series.set(seriesId, tasks);
  }

  let created = 0;
  for (const [seriesId, seriesTasks] of series) {
    seriesTasks.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    const template = seriesTasks[0];
    if (!template.recurrence || template.dueDate > currentDate) continue;

    const existingDates = new Set(seriesTasks.map((task) => task.dueDate));
    const excludedDates = new Set(
      seriesTasks.flatMap((task) => task.recurrenceExcludedDates ?? []),
    );
    let dueDate = template.dueDate;
    let occurrence = template.recurrenceOccurrence ?? 1;
    let iterations = 0;

    while (dueDate <= currentDate && iterations < 10_000) {
      if (
        (!template.recurrence.endDate || dueDate <= template.recurrence.endDate) &&
        !existingDates.has(dueDate) &&
        !excludedDates.has(dueDate)
      ) {
        const task = cloneOccurrence(
          workspace,
          template,
          seriesId,
          dueDate,
          occurrence,
          currentDate,
        );
        workspace.tasks.unshift(task);
        existingDates.add(dueDate);
        created += 1;
      }

      if (template.recurrence.endDate && dueDate >= template.recurrence.endDate) break;
      const nextDate = advanceRecurringDate(dueDate, template.recurrence);
      if (nextDate <= dueDate) break;
      dueDate = nextDate;
      occurrence += 1;
      iterations += 1;
    }
  }

  return created;
}
