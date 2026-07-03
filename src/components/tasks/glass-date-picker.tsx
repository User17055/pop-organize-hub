import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function parseDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toInputDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDisplay(value?: string, placeholder = "Selecionar data") {
  const date = parseDate(value);
  return date ? format(date, "dd/MM/yyyy") : placeholder;
}

export function GlassDatePicker({
  value,
  onChange,
  placeholder,
  compact = false,
  required,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  required?: boolean;
  ariaLabel?: string;
}) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const nextDate = parseDate(value);
    if (nextDate) setVisibleMonth(startOfMonth(nextDate));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
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

      const width = Math.min(292, window.innerWidth - 24);
      const popoverHeight = popoverRef.current?.offsetHeight ?? 324;
      const gap = 8;
      const viewportPadding = 12;
      const drawer = rootRef.current?.closest(".task-create-drawer, .calendar-detail-drawer");
      const drawerHeader = drawer?.querySelector("header");
      const headerBottom = drawerHeader?.getBoundingClientRect().bottom ?? viewportPadding;
      const minTop = Math.max(viewportPadding, headerBottom + gap);
      const spaceAbove = trigger.top - minTop;
      const preferredTop =
        spaceAbove >= popoverHeight + gap
          ? trigger.top - popoverHeight - gap
          : trigger.bottom + gap;
      const top = Math.min(
        Math.max(minTop, preferredTop),
        window.innerHeight - popoverHeight - viewportPadding,
      );
      const safeTop = Math.max(minTop, top);
      const maxHeight = Math.max(220, window.innerHeight - safeTop - viewportPadding);
      const left = Math.min(
        Math.max(viewportPadding, trigger.right - width),
        window.innerWidth - width - viewportPadding,
      );

      setPopoverStyle({ left, top: safeTop, width, maxHeight });
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
  }, [open, visibleMonth]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  function selectDate(date: Date) {
    onChange(toInputDate(date));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="glass-date-picker relative">
      <button
        type="button"
        className={cn(
          "task-create-input flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left outline-none transition",
          compact ? "h-8 text-xs" : "h-10 text-sm",
          open && "task-create-select-open",
        )}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-required={required || undefined}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {formatDisplay(value, placeholder)}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={popoverRef}
            className="glass-date-popover fixed z-[260] rounded-lg border p-3"
            style={popoverStyle ?? { opacity: 0, pointerEvents: "none" }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => startOfMonth(subMonths(current, 1)))}
                className="glass-date-nav"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-bold capitalize text-foreground">
                {format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => startOfMonth(addMonths(current, 1)))}
                className="glass-date-nav"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted-foreground">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                <div key={`${day}-${index}`} className="h-6 leading-6">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                const today = isSameDay(day, new Date());
                const outside = !isSameMonth(day, visibleMonth);

                return (
                  <button
                    key={toInputDate(day)}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={cn(
                      "glass-date-day",
                      outside && "glass-date-day-outside",
                      today && "glass-date-day-today",
                      selected && "glass-date-day-selected",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-bold text-muted-foreground transition hover:text-foreground"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                className="text-xs font-bold text-primary transition hover:text-primary/80"
              >
                Hoje
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
