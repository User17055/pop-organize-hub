import type { Task, TaskRecurrence } from "./domain";

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function dateString(year: number, month: number, day: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    Math.min(day, lastDay),
  ).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const { year, month, day } = dateParts(value);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function addMonths(value: string, months: number, preferredDay?: number) {
  const { year, month, day } = dateParts(value);
  const target = new Date(year, month - 1 + months, 1);
  return dateString(target.getFullYear(), target.getMonth() + 1, preferredDay ?? day);
}

function addYears(value: string, years: number, preferredMonth?: number, preferredDay?: number) {
  const { year, month, day } = dateParts(value);
  return dateString(year + years, preferredMonth ?? month, preferredDay ?? day);
}

function nextSelectedWeekDay(value: string, weekDays: number[], intervalWeeks = 1) {
  const selected = [...new Set(weekDays)]
    .filter((day) => day >= 1 && day <= 7)
    .sort((a, b) => a - b);
  if (selected.length === 0) return addDays(value, intervalWeeks * 7);
  const { year, month, day } = dateParts(value);
  const current = new Date(year, month - 1, day);
  const currentWeekDay = current.getDay() || 7;
  const laterThisWeek = selected.find((weekDay) => weekDay > currentWeekDay);
  if (laterThisWeek != null) return addDays(value, laterThisWeek - currentWeekDay);
  return addDays(value, intervalWeeks * 7 - currentWeekDay + selected[0]);
}

function nextDailyDate(value: string, excludedWeekDays: number[], intervalDays = 1) {
  const excluded = new Set(excludedWeekDays.filter((day) => day >= 1 && day <= 7));
  let next = addDays(value, intervalDays);
  for (let attempts = 0; attempts < 7 && excluded.size < 7; attempts += 1) {
    const { year, month, day } = dateParts(next);
    const weekDay = new Date(year, month - 1, day).getDay() || 7;
    if (!excluded.has(weekDay)) return next;
    next = addDays(next, 1);
  }
  return next;
}

export function advanceRecurringDate(value: string, recurrence: TaskRecurrence) {
  if (recurrence.frequency === "daily") {
    return nextDailyDate(value, recurrence.excludedWeekDays ?? [], recurrence.interval ?? 1);
  }
  if (recurrence.frequency === "weekly") {
    return nextSelectedWeekDay(value, recurrence.weekDays ?? [], recurrence.interval ?? 1);
  }
  if (recurrence.frequency === "biweekly") {
    return nextSelectedWeekDay(value, recurrence.weekDays ?? [], 2);
  }
  if (recurrence.frequency === "monthly") {
    return addMonths(value, 1, recurrence.dayOfMonth);
  }
  if (recurrence.frequency === "yearly") {
    return addYears(value, 1, recurrence.monthOfYear, recurrence.dayOfMonth);
  }

  const interval = recurrence.interval ?? recurrence.intervalDays ?? 1;
  if (recurrence.customUnit === "weeks") return addDays(value, interval * 7);
  if (recurrence.customUnit === "months") {
    return addMonths(value, interval, recurrence.dayOfMonth);
  }
  if (recurrence.customUnit === "years") {
    return addYears(value, interval, recurrence.monthOfYear, recurrence.dayOfMonth);
  }
  return addDays(value, interval);
}

export function recurringTaskDatesInRange(task: Task, rangeStart: string, rangeEnd: string) {
  if (!task.recurrence || rangeEnd < task.dueDate) return [];

  const dates: string[] = [];
  let occurrence = advanceRecurringDate(task.dueDate, task.recurrence);
  let iterations = 0;

  while (occurrence < rangeStart && iterations < 10_000) {
    occurrence = advanceRecurringDate(occurrence, task.recurrence);
    iterations += 1;
  }

  while (occurrence <= rangeEnd && iterations < 10_000) {
    if (!task.recurrence.endDate || occurrence <= task.recurrence.endDate) {
      if (!(task.recurrenceExcludedDates ?? []).includes(occurrence)) {
        dates.push(occurrence);
      }
    } else {
      break;
    }
    occurrence = advanceRecurringDate(occurrence, task.recurrence);
    iterations += 1;
  }

  return dates;
}

export function sortedList<T extends number | string>(values?: T[]) {
  if (!values?.length) return undefined;
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

/**
 * A cadência da regra, sem a data de fim e sem os horários. É o que decide quais datas a série
 * gera: se ela muda, a série precisa ser dividida; fim e horários valem para a série inteira e
 * não mudam data nenhuma. Listas vazias e ausentes contam como iguais, porque o painel e os
 * aplicativos gravam a mesma regra de um jeito e de outro.
 */
export function recurrenceCadenceKey(recurrence?: TaskRecurrence) {
  if (!recurrence) return "";
  return JSON.stringify({
    frequency: recurrence.frequency,
    weekDays: sortedList(recurrence.weekDays),
    excludedWeekDays: sortedList(recurrence.excludedWeekDays),
    interval: recurrence.interval,
    intervalDays: recurrence.intervalDays,
    customUnit: recurrence.customUnit,
    dayOfMonth: recurrence.dayOfMonth,
    monthOfYear: recurrence.monthOfYear,
  });
}
