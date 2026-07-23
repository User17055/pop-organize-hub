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

export function advanceRecurringDate(value: string, recurrence: TaskRecurrence) {
  if (recurrence.frequency === "daily") return addDays(value, 1);
  if (recurrence.frequency === "weekly") return addDays(value, 7);
  if (recurrence.frequency === "biweekly") return addDays(value, 14);
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
      dates.push(occurrence);
    } else {
      break;
    }
    occurrence = advanceRecurringDate(occurrence, task.recurrence);
    iterations += 1;
  }

  return dates;
}
