import type {
  Priority,
  RecurrenceCustomUnit,
  RecurrenceFrequency,
  Task,
  TaskRecurrence,
} from "@/lib/domain";

export type TaskFormState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  targetKey: string;
  responsibleId: string;
  reviewerId: string;
  requiresReview: boolean;
  tags: string;
  checklist: string;
  recurrence: RecurrenceFormState;
};

export type TaskEditState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  tags: string;
  targetKey: string;
  responsibleId: string;
  recurrence: RecurrenceFormState;
};

export type RecurrenceFormState = {
  frequency: RecurrenceFrequency | "none";
  interval: string;
  customUnit: RecurrenceCustomUnit;
  dayOfMonth: string;
  monthOfYear: string;
  endDate: string;
};

export type RecurrenceInput =
  | {
      frequency: RecurrenceFrequency;
      interval?: number;
      intervalDays?: number;
      customUnit?: RecurrenceCustomUnit;
      dayOfMonth?: number;
      monthOfYear?: number;
      endDate?: string;
    }
  | undefined;

export function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export const recurrenceOptions: Array<{ value: RecurrenceFormState["frequency"]; label: string }> =
  [
    { value: "none", label: "Sem recorrência" },
    { value: "daily", label: "Diária" },
    { value: "weekly", label: "Semanal" },
    { value: "biweekly", label: "Quinzenal" },
    { value: "monthly", label: "Mensal" },
    { value: "yearly", label: "Anual" },
    { value: "custom", label: "Personalizada" },
  ];

export const customUnitOptions: Array<{ value: RecurrenceCustomUnit; label: string }> = [
  { value: "days", label: "dias" },
  { value: "weeks", label: "semanas" },
  { value: "months", label: "meses" },
  { value: "years", label: "anos" },
];

export const monthOptions = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
].map((label, index) => ({ value: String(index + 1), label }));

export function clampNumber(
  value: string | number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function getDueDateAnchor(dueDate?: string) {
  const [, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate ?? "") ?? [];
  return {
    dayOfMonth: day ? String(Number(day)) : "1",
    monthOfYear: month ? String(Number(month)) : "1",
  };
}

export function formatFileSizeMb(sizeInBytes: number) {
  if (sizeInBytes <= 0) return "0 MB";
  const sizeInMb = sizeInBytes / 1_048_576;
  const precision = sizeInMb >= 1 ? 1 : sizeInMb >= 0.1 ? 2 : 3;
  return `${sizeInMb.toFixed(precision).replace(".", ",")} MB`;
}

export function isOverdue(task: Task) {
  if (task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due < today;
}

export function taskTargetLabel(target: Task["target"]) {
  if (target.type === "company") return target.label;
  const prefix = {
    department: "Setor",
    group: "Grupo",
    user: "Pessoa",
  }[target.type];
  return `${prefix}: ${target.label}`;
}

export function getDefaultRecurrence(dueDate?: string): RecurrenceFormState {
  const anchor = getDueDateAnchor(dueDate);
  return {
    frequency: "none",
    interval: "1",
    customUnit: "days",
    dayOfMonth: anchor.dayOfMonth,
    monthOfYear: anchor.monthOfYear,
    endDate: "",
  };
}

export function recurrenceToForm(
  recurrence?: TaskRecurrence,
  dueDate?: string,
): RecurrenceFormState {
  const anchor = getDueDateAnchor(dueDate);
  return {
    frequency: recurrence?.frequency ?? "none",
    interval: String(recurrence?.interval ?? recurrence?.intervalDays ?? 1),
    customUnit: recurrence?.customUnit ?? "days",
    dayOfMonth: String(recurrence?.dayOfMonth ?? anchor.dayOfMonth),
    monthOfYear: String(recurrence?.monthOfYear ?? anchor.monthOfYear),
    endDate: recurrence?.endDate ?? "",
  };
}

export function recurrenceFromForm(recurrence: RecurrenceFormState): RecurrenceInput {
  if (recurrence.frequency === "none") return undefined;

  const endDate = recurrence.endDate || undefined;
  const dayOfMonth = clampNumber(recurrence.dayOfMonth, 1, 31, 1);
  const monthOfYear = clampNumber(recurrence.monthOfYear, 1, 12, 1);

  if (recurrence.frequency === "monthly") {
    return { frequency: recurrence.frequency, dayOfMonth, endDate };
  }

  if (recurrence.frequency === "yearly") {
    return { frequency: recurrence.frequency, dayOfMonth, monthOfYear, endDate };
  }

  if (recurrence.frequency === "custom") {
    const interval = clampNumber(recurrence.interval, 1, 120, 1);
    return {
      frequency: recurrence.frequency,
      interval,
      intervalDays: recurrence.customUnit === "days" ? interval : undefined,
      customUnit: recurrence.customUnit,
      dayOfMonth:
        recurrence.customUnit === "months" || recurrence.customUnit === "years"
          ? dayOfMonth
          : undefined,
      monthOfYear: recurrence.customUnit === "years" ? monthOfYear : undefined,
      endDate,
    };
  }

  return { frequency: recurrence.frequency, endDate };
}

export function recurrenceLabel(recurrence?: TaskRecurrence) {
  if (!recurrence) return "Sem recorrência";

  const interval = recurrence.interval ?? recurrence.intervalDays ?? 1;
  const unit = recurrence.customUnit ?? "days";
  const hasDayOfMonth = recurrence.dayOfMonth != null;
  const hasMonthOfYear = recurrence.monthOfYear != null;
  const dayOfMonth = recurrence.dayOfMonth ?? 1;
  const monthName = monthOptions[(recurrence.monthOfYear ?? 1) - 1]?.label ?? "Janeiro";
  const plural = (value: number, singular: string, pluralText: string) =>
    value === 1 ? singular : pluralText;

  const label =
    recurrence.frequency === "daily"
      ? "Diária"
      : recurrence.frequency === "weekly"
        ? "Semanal"
        : recurrence.frequency === "biweekly"
          ? "Quinzenal"
          : recurrence.frequency === "monthly"
            ? hasDayOfMonth
              ? `Mensal no dia ${dayOfMonth}`
              : "Mensal pelo dia do prazo"
            : recurrence.frequency === "yearly"
              ? hasDayOfMonth && hasMonthOfYear
                ? `Anual em ${dayOfMonth} de ${monthName.toLowerCase()}`
                : "Anual pelo dia do prazo"
              : unit === "weeks"
                ? `A cada ${interval} ${plural(interval, "semana", "semanas")}`
                : unit === "months"
                  ? hasDayOfMonth
                    ? `A cada ${interval} ${plural(interval, "mês", "meses")} no dia ${dayOfMonth}`
                    : `A cada ${interval} ${plural(interval, "mês", "meses")}`
                  : unit === "years"
                    ? hasDayOfMonth && hasMonthOfYear
                      ? `A cada ${interval} ${plural(interval, "ano", "anos")} em ${dayOfMonth} de ${monthName.toLowerCase()}`
                      : `A cada ${interval} ${plural(interval, "ano", "anos")}`
                    : `A cada ${interval} ${plural(interval, "dia", "dias")}`;

  return recurrence.endDate
    ? `${label} até ${new Date(`${recurrence.endDate}T00:00:00`).toLocaleDateString("pt-BR")}`
    : label;
}
