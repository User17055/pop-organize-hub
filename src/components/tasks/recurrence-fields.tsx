import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecurrenceCustomUnit } from "@/lib/domain";
import { Field } from "@/components/form-field";
import { GlassDatePicker } from "./glass-date-picker";
import {
  customUnitOptions,
  monthOptions,
  recurrenceOptions,
  type RecurrenceFormState,
} from "./task-form-types";

const timesPerDayOptions = Array.from({ length: 12 }, (_, index) => {
  const count = index + 1;
  return {
    value: String(count),
    label: count === 1 ? "1 vez por dia" : `${count} vezes por dia`,
  };
});

function defaultTimes(count: number) {
  if (count < 1) return [];
  if (count === 1) return [""];
  const firstMinute = 8 * 60;
  const lastMinute = 20 * 60;
  return Array.from({ length: count }, (_, index) => {
    const minutes = Math.round(firstMinute + ((lastMinute - firstMinute) * index) / (count - 1));
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}

function resizeTimes(current: string[], count: number) {
  if (count < 1) return [];
  const defaults = defaultTimes(count);
  return Array.from({ length: count }, (_, index) => current[index] ?? defaults[index]);
}

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
    ? "task-create-input h-8 w-full rounded-md border px-2 text-xs outline-none"
    : "task-create-input h-9 w-full rounded-md border px-3 text-sm outline-none";
  const update = (patch: Partial<RecurrenceFormState>) => onChange({ ...value, ...patch });
  const isActive = value.frequency !== "none";
  const showMonthlyDay =
    value.frequency === "monthly" ||
    (value.frequency === "custom" && value.customUnit === "months");
  const showYearlyDate =
    value.frequency === "yearly" || (value.frequency === "custom" && value.customUnit === "years");
  const showWeekDays =
    value.frequency === "daily" || value.frequency === "weekly" || value.frequency === "biweekly";
  const weekDays = [
    { value: 1, label: "S" },
    { value: 2, label: "T" },
    { value: 3, label: "Q" },
    { value: 4, label: "Q" },
    { value: 5, label: "S" },
    { value: 6, label: "S" },
    { value: 7, label: "D" },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-3", !compact && "md:grid-cols-2")}>
      <Field label="Frequência">
        <GlassSelect
          value={value.frequency}
          options={recurrenceOptions}
          onChange={(frequency) =>
            update({ frequency: frequency as RecurrenceFormState["frequency"] })
          }
          compact={compact}
        />
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
            <GlassSelect
              value={value.customUnit}
              options={customUnitOptions}
              onChange={(customUnit) => update({ customUnit: customUnit as RecurrenceCustomUnit })}
              compact={compact}
            />
          </div>
        </Field>
      )}

      {showWeekDays && (
        <Field
          label={value.frequency === "daily" ? "Não repetir nestes dias" : "Repetir nestes dias"}
        >
          <div>
            <div className="flex justify-between gap-1">
              {weekDays.map((day) => {
                const selectedDays =
                  value.frequency === "daily" ? value.excludedWeekDays : value.weekDays;
                const selected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "h-8 w-8 rounded-full border text-xs font-bold transition",
                      selected
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "task-create-input text-muted-foreground",
                    )}
                    onClick={() => {
                      const nextDays = selected
                        ? selectedDays.filter((value) => value !== day.value)
                        : [...selectedDays, day.value].sort((left, right) => left - right);
                      if (value.frequency === "daily" && nextDays.length === 7) return;
                      update(
                        value.frequency === "daily"
                          ? { excludedWeekDays: nextDays }
                          : { weekDays: nextDays },
                      );
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>
      )}

      {value.frequency === "daily" && (
        <>
          <Field label="Quantas vezes no mesmo dia">
            <GlassSelect
              value={String(Math.max(value.times.length, 1))}
              options={timesPerDayOptions}
              onChange={(count) => update({ times: resizeTimes(value.times, Number(count)) })}
              compact={compact}
            />
          </Field>

          <div className={cn("space-y-2", !compact && "md:col-span-2")}>
            <div>
              <p className="text-sm font-medium text-foreground">
                {value.times.length >= 2 ? "Horários das ocorrências" : "Horário da ocorrência"}
              </p>
              <p className="text-xs text-muted-foreground">
                {value.times.length >= 2
                  ? "Cada horário representa uma repetição da tarefa no mesmo dia."
                  : "Opcional: defina o horário da tarefa diária."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {(value.times.length > 0 ? value.times : [""]).map((time, index) => (
                <label key={index} className="space-y-1">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {value.times.length >= 2 ? `Horário ${index + 1}` : "Horário"}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => {
                      const times = value.times.length > 0 ? [...value.times] : [""];
                      times[index] = event.target.value;
                      update({ times });
                    }}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
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
            <GlassSelect
              value={value.monthOfYear}
              options={monthOptions}
              onChange={(monthOfYear) => update({ monthOfYear })}
              compact={compact}
            />
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
          <GlassDatePicker
            value={value.endDate}
            onChange={(endDate) => update({ endDate })}
            placeholder="Sem data final"
            compact={compact}
            aria-label="Data final da recorrência"
          />
        </Field>
      )}
    </div>
  );
}

export function GlassSelect({
  value,
  options,
  onChange,
  compact,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const viewportPadding = 12;
      const gap = 6;
      const width = Math.min(trigger.width, window.innerWidth - viewportPadding * 2);
      const menuHeight = menuRef.current?.offsetHeight ?? Math.min(224, options.length * 36 + 8);
      const spaceBelow = window.innerHeight - trigger.bottom - viewportPadding;
      const top =
        spaceBelow >= Math.min(menuHeight, 224) + gap
          ? trigger.bottom + gap
          : Math.max(viewportPadding, trigger.top - Math.min(menuHeight, 224) - gap);
      const left = Math.min(
        Math.max(viewportPadding, trigger.left),
        window.innerWidth - width - viewportPadding,
      );
      const maxHeight = Math.max(
        128,
        top > trigger.top
          ? window.innerHeight - top - viewportPadding
          : trigger.top - viewportPadding - gap,
      );

      setMenuStyle({ left, top, width, maxHeight });
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  return (
    <div ref={rootRef} className="task-create-select relative">
      <button
        type="button"
        className={cn(
          "task-create-input flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left outline-none transition",
          compact ? "h-8 text-xs" : "h-9 text-sm",
          open && "task-create-select-open",
        )}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            className="task-create-select-menu fixed z-[260] rounded-md border p-1"
            role="listbox"
            // `pointerEvents: "auto"` nao e decorativo: o menu e portalizado para o `document.body`,
            // e um Dialog/Sheet do Radix aberto marca o proprio `body` com `pointer-events: none`
            // enquanto durar. O menu herdava isso e ficava *pintado mas nao clicavel* -- o clique
            // atravessava e acertava o que estivesse embaixo, dentro do Sheet. Em `grupos.tsx` isso
            // fazia o seletor de lider nunca gravar e ainda desmarcar um membro da lista.
            //
            // Medido na pagina antes de consertar: `getComputedStyle(opcao).pointerEvents` era
            // "none" e `document.elementFromPoint` no centro da opcao devolvia o bloco "Membros".
            //
            // Nao muda nada onde nao ha Sheet -- `auto` ja e o comportamento normal ali.
            style={
              menuStyle
                ? { ...menuStyle, pointerEvents: "auto" }
                : { opacity: 0, pointerEvents: "none" }
            }
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "task-create-select-option flex h-8 w-full items-center rounded px-2.5 text-left text-sm font-medium transition",
                  option.value === value && "task-create-select-option-active",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
