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
            style={menuStyle ?? { opacity: 0, pointerEvents: "none" }}
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
