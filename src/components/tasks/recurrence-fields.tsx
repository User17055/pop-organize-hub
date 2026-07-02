import { cn } from "@/lib/utils";
import type { RecurrenceCustomUnit } from "@/lib/domain";
import { Field } from "@/components/form-field";
import {
  customUnitOptions,
  monthOptions,
  recurrenceOptions,
  type RecurrenceFormState,
} from "./task-form-types";

export function RecurrenceFields({
  value,
  onChange,
  compact = false,
}: {
  value: RecurrenceFormState;
  onChange: (value: RecurrenceFormState) => void;
  compact?: boolean;
}) {
  const inputClass = compact
    ? "h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary"
    : "w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm";
  const update = (patch: Partial<RecurrenceFormState>) => onChange({ ...value, ...patch });
  const isActive = value.frequency !== "none";
  const showMonthlyDay =
    value.frequency === "monthly" ||
    (value.frequency === "custom" && value.customUnit === "months");
  const showYearlyDate =
    value.frequency === "yearly" || (value.frequency === "custom" && value.customUnit === "years");

  return (
    <div className={cn("grid grid-cols-1 gap-3", !compact && "sm:grid-cols-2")}>
      <Field label="Frequência">
        <select
          value={value.frequency}
          onChange={(event) =>
            update({ frequency: event.target.value as RecurrenceFormState["frequency"] })
          }
          className={inputClass}
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {value.frequency === "custom" && (
        <Field label="Repetir a cada">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
            <input
              type="number"
              min={1}
              max={120}
              value={value.interval}
              onChange={(event) => update({ interval: event.target.value })}
              className={inputClass}
            />
            <select
              value={value.customUnit}
              onChange={(event) =>
                update({ customUnit: event.target.value as RecurrenceCustomUnit })
              }
              className={inputClass}
            >
              {customUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
      )}

      {showMonthlyDay && (
        <Field label="Dia do mês">
          <input
            type="number"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(event) => update({ dayOfMonth: event.target.value })}
            className={inputClass}
          />
        </Field>
      )}

      {showYearlyDate && (
        <>
          <Field label="Mês">
            <select
              value={value.monthOfYear}
              onChange={(event) => update({ monthOfYear: event.target.value })}
              className={inputClass}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dia">
            <input
              type="number"
              min={1}
              max={31}
              value={value.dayOfMonth}
              onChange={(event) => update({ dayOfMonth: event.target.value })}
              className={inputClass}
            />
          </Field>
        </>
      )}

      {isActive && (
        <Field label="Parar em">
          <input
            type="date"
            value={value.endDate}
            onChange={(event) => update({ endDate: event.target.value })}
            className={inputClass}
            aria-label="Data final da recorrência"
          />
        </Field>
      )}
    </div>
  );
}
