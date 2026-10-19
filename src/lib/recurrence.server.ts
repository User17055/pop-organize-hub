import type { Database } from "./database";
import { nextId } from "./database";
import type { Task, TaskRecurrence } from "./domain";
import { invalidateNativeShadow } from "./native-shadow";
import { sortedList } from "./recurrence";

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

function nextSelectedWeekDay(value: string, weekDays: number[], intervalWeeks = 1) {
  const selected = [...new Set(weekDays)]
    .filter((day) => day >= 1 && day <= 7)
    .sort((a, b) => a - b);
  if (selected.length === 0) return addDays(value, intervalWeeks * 7);
  const { year, month, day } = dateParts(value);
  const current = new Date(Date.UTC(year, month - 1, day));
  const currentWeekDay = current.getUTCDay() || 7;
  const laterThisWeek = selected.find((weekDay) => weekDay > currentWeekDay);
  if (laterThisWeek != null) return addDays(value, laterThisWeek - currentWeekDay);
  return addDays(value, intervalWeeks * 7 - currentWeekDay + selected[0]);
}

function nextDailyDate(value: string, excludedWeekDays: number[], intervalDays = 1) {
  const excluded = new Set(excludedWeekDays.filter((day) => day >= 1 && day <= 7));
  let next = addDays(value, intervalDays);
  for (let attempts = 0; attempts < 7 && excluded.size < 7; attempts += 1) {
    const { year, month, day } = dateParts(next);
    const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
    if (!excluded.has(weekDay)) return next;
    next = addDays(next, 1);
  }
  return next;
}

export function advanceRecurringDate(date: string, recurrence: NonNullable<Task["recurrence"]>) {
  if (recurrence.frequency === "daily") {
    return nextDailyDate(date, recurrence.excludedWeekDays ?? [], recurrence.interval ?? 1);
  }
  if (recurrence.frequency === "weekly") {
    return nextSelectedWeekDay(date, recurrence.weekDays ?? [], recurrence.interval ?? 1);
  }
  if (recurrence.frequency === "biweekly") {
    return nextSelectedWeekDay(date, recurrence.weekDays ?? [], 2);
  }
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
    recurrenceSeriesEndDate: template.recurrenceSeriesEndDate,
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
    const endDate = earlierDate(template.recurrence.endDate, template.recurrenceSeriesEndDate);
    let dueDate = template.dueDate;
    let occurrence = template.recurrenceOccurrence ?? 1;
    let iterations = 0;

    while (dueDate <= currentDate && iterations < 10_000) {
      if (
        (!endDate || dueDate <= endDate) &&
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

      if (endDate && dueDate >= endDate) break;
      const nextDate = advanceRecurringDate(dueDate, template.recurrence);
      if (nextDate <= dueDate) break;
      dueDate = nextDate;
      occurrence += 1;
      iterations += 1;
    }
  }

  return created;
}

function earlierDate(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function seriesIdOf(task: Task) {
  return task.recurrenceParentId ?? task.id;
}

function withEndDate(recurrence: TaskRecurrence, endDate?: string): TaskRecurrence {
  const next = { ...recurrence };
  if (endDate) next.endDate = endDate;
  else delete next.endDate;
  return next;
}

/** Recorrência que respeita o fim de uma série encerrada, venha ela do painel ou do aparelho. */
export function clampRecurrenceToSeriesEnd(
  recurrence: Task["recurrence"],
  seriesEndDate?: string,
): Task["recurrence"] {
  if (!recurrence || !seriesEndDate) return recurrence;
  return withEndDate(recurrence, earlierDate(recurrence.endDate, seriesEndDate));
}

/**
 * Ocorrência ainda intocada: pendente, sem comentário, anexo nem subtarefa feita. É a única que
 * pode sumir quando a série muda, porque o gerador a recriaria igual se a regra fosse a mesma.
 */
function isUntouchedOccurrence(task: Task) {
  return (
    task.status === "pending" &&
    !task.comments &&
    !task.attachments &&
    !(task.subtasks ?? []).some((subtask) => subtask.done)
  );
}

/**
 * Muda a cadência a partir da ocorrência `task`.
 *
 * A regra fica gravada em cada linha da série, e o gerador parte da linha mais antiga. Trocar só a
 * linha editada deixava a regra antiga gerando ocorrências ao lado da nova. Aqui a série antiga é
 * encerrada no dia anterior a `fromDate`, suas ocorrências intocadas daí em diante saem, e `task`
 * vira o início de uma série nova com `next` (ou deixa de repetir, se `next` for vazio).
 *
 * Aplicar a regra nova à série inteira não serve: o gerador a começaria na primeira ocorrência e
 * criaria tarefas atrasadas no passado.
 */
export function changeSeriesRecurrence(
  workspace: Database,
  task: Task,
  next: Task["recurrence"],
  fromDate: string,
  // Quem edita só apaga a ocorrência que pode ver e excluir; as outras ficam e só são encerradas.
  canRemove: (task: Task) => boolean = () => true,
) {
  const seriesId = seriesIdOf(task);
  const lastDay = addDays(fromDate, -1);
  const removedIds = new Set<string>();
  const keptDates: string[] = [];
  const remaining: Task[] = [];

  for (const sibling of workspace.tasks) {
    if (sibling === task || !sibling.recurrence || seriesIdOf(sibling) !== seriesId) continue;
    if (sibling.dueDate >= fromDate) {
      if (isUntouchedOccurrence(sibling) && canRemove(sibling)) {
        removedIds.add(sibling.id);
        continue;
      }
      keptDates.push(sibling.dueDate);
    }
    sibling.recurrenceSeriesEndDate = earlierDate(sibling.recurrenceSeriesEndDate, lastDay);
    sibling.recurrence = clampRecurrenceToSeriesEnd(
      sibling.recurrence,
      sibling.recurrenceSeriesEndDate,
    );
    // O `nativeData` da série antiga fica intacto de propósito: o fim chega ao aparelho pelo
    // `recurrenceSeriesEndDate`, e apagar a regra crua faria a próxima sincronização enxergar
    // mudança de cadência onde não houve.
    remaining.push(sibling);
  }

  if (removedIds.size) {
    workspace.tasks = workspace.tasks.filter((item) => !removedIds.has(item.id));
  }

  // Quando a linha editada é a raiz, as outras apontam para o id dela. Ele passa a ser o id da
  // série nova, então o que sobrou da antiga ganha como raiz a sua ocorrência mais antiga.
  if (task.id === seriesId && remaining.length) {
    const oldestId = [...remaining].sort((left, right) =>
      left.dueDate.localeCompare(right.dueDate),
    )[0].id;
    for (const sibling of remaining) sibling.recurrenceParentId = oldestId;
  }

  task.recurrence = next;
  delete task.recurrenceParentId;
  delete task.recurrenceSeriesEndDate;
  task.recurrenceOccurrence = next ? 1 : undefined;
  // Uma ocorrência antiga que já foi mexida continua de pé; a série nova não cria outra na mesma data.
  const excluded = sortedList(keptDates.filter((date) => date !== task.dueDate));
  task.recurrenceExcludedDates = next ? excluded : undefined;
  invalidateNativeShadow(task, "recurrence", "recurrenceOccurrence");

  return { removedIds: [...removedIds] };
}

/**
 * A data de fim vale para a série inteira: o gerador lê a da linha mais antiga, então mudar só a
 * linha editada não encerrava nada. Ocorrências intocadas depois do fim novo saem.
 */
export function applySeriesEndDate(
  workspace: Database,
  task: Task,
  endDate?: string,
  canRemove: (task: Task) => boolean = () => true,
) {
  const seriesId = seriesIdOf(task);
  const removedIds = new Set<string>();
  for (const item of workspace.tasks) {
    if (!item.recurrence || seriesIdOf(item) !== seriesId) continue;
    if (
      item !== task &&
      endDate &&
      item.dueDate > endDate &&
      isUntouchedOccurrence(item) &&
      canRemove(item)
    ) {
      removedIds.add(item.id);
      continue;
    }
    item.recurrence = withEndDate(
      item.recurrence,
      earlierDate(endDate, item.recurrenceSeriesEndDate),
    );
    invalidateNativeShadow(item, "recurrenceEnd");
  }
  if (removedIds.size) {
    workspace.tasks = workspace.tasks.filter((item) => !removedIds.has(item.id));
  }
  return { removedIds: [...removedIds] };
}

/** Horários da série, aplicados a todas as linhas pelo mesmo motivo da data de fim. */
export function applySeriesTimes(workspace: Database, task: Task, times?: string[]) {
  const seriesId = seriesIdOf(task);
  for (const item of workspace.tasks) {
    if (!item.recurrence || seriesIdOf(item) !== seriesId) continue;
    const next = { ...item.recurrence };
    if (times?.length) next.times = [...times];
    else delete next.times;
    item.recurrence = next;
    invalidateNativeShadow(item, "recurrenceTimes");
  }
}

/**
 * Uma ocorrência que mudou de data deixa a data antiga vaga, e o gerador a recriava. A data antiga
 * passa a contar como excluída na série, como já faz a exclusão de "somente esta data".
 */
export function excludeSeriesDate(workspace: Database, task: Task, date: string) {
  const seriesId = seriesIdOf(task);
  for (const item of workspace.tasks) {
    if (!item.recurrence || seriesIdOf(item) !== seriesId) continue;
    item.recurrenceExcludedDates = Array.from(
      new Set([...(item.recurrenceExcludedDates ?? []), date]),
    );
  }
}
