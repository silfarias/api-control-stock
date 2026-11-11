const CALENDAR_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class InvalidCalendarDayError extends Error {
  constructor(message = 'fecha debe ser una fecha real en formato YYYY-MM-DD') {
    super(message);
    this.name = 'InvalidCalendarDayError';
  }
}

/** Normaliza y valida un día calendario YYYY-MM-DD (rechaza 2026-02-31, etc.). */
export function parseCalendarDay(fecha: string): string {
  const match = CALENDAR_DAY_RE.exec(fecha.trim());
  if (!match) {
    throw new InvalidCalendarDayError();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new InvalidCalendarDayError();
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Rango de un día comercial en la zona horaria de la DB (DB_TIMEZONE, típ. -03:00):
 * [desde 00:00:00, hastaExclusivo 00:00:00 del día siguiente).
 * Evita funciones sobre la columna y el hueco de 23:59:59.
 */
export function buildCalendarDayRange(fecha: string): {
  desde: string;
  hastaExclusivo: string;
} {
  const day = parseCalendarDay(fecha);
  const [year, month, dayNum] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, dayNum + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');

  return {
    desde: `${day} 00:00:00`,
    hastaExclusivo: `${y}-${m}-${d} 00:00:00`,
  };
}
