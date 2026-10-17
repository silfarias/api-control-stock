/**
 * Utilidades para fecha/hora en zona horaria Argentina (America/Argentina/Buenos_Aires).
 * Usado para guardar la expiración del código de verificación en hora local y que en la DB se vea correcta.
 */

const TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Formato esperado en DB: "YYYY-MM-DD HH:mm:ss" */
const FORMAT_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/**
 * Formatea un Date (instant UTC) a string en hora Argentina "YYYY-MM-DD HH:mm:ss".
 */
export function formatDateArgentina(date: Date): string {
  const s = date.toLocaleString('en-CA', {
    timeZone: TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return s.replace(', ', ' ');
}

/**
 * Parsea un string "YYYY-MM-DD HH:mm:ss" (guardado en hora Argentina) al instante UTC correspondiente.
 * Argentina usa UTC-3 (sin horario de verano).
 */
export function parseArgentinaToDate(dateStr: string): Date {
  if (!dateStr || !FORMAT_REGEX.test(dateStr.trim())) {
    return new Date(NaN);
  }
  const iso = dateStr.trim().replace(' ', 'T') + '-03:00';
  return new Date(iso);
}
