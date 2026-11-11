export function parseTaskDuration(value: string): number | undefined {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (!normalized || normalized === "sem duração") return undefined;
  if (
    !/^(?:\d+\s*(?:horas?|h)(?:\s*\d+\s*(?:minutos?|min|m))?|\d+\s*(?:minutos?|min|m)?)$/.test(
      normalized,
    )
  )
    return undefined;
  const hours = Number(normalized.match(/(\d+)\s*(?:horas?|h)/)?.[1] ?? 0);
  const minuteMatch = normalized.match(/(\d+)\s*(?:minutos?|min|m)(?![a-z])/);
  const minutes = minuteMatch ? Number(minuteMatch[1]) : hours ? 0 : Number(normalized);
  const total = hours * 60 + minutes;
  return Number.isInteger(total) && total >= 1 && total <= 1440 ? total : undefined;
}

export function formatTaskDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return "Sem duração";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}
