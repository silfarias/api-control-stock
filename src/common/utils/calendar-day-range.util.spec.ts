import { describe, expect, it } from 'vitest';
import {
  buildCalendarDayRange,
  InvalidCalendarDayError,
  parseCalendarDay,
} from './calendar-day-range.util.js';

describe('calendar-day-range', () => {
  it('acepta YYYY-MM-DD real', () => {
    expect(parseCalendarDay('2026-11-11')).toBe('2026-11-11');
  });

  it('rechaza formato inválido', () => {
    expect(() => parseCalendarDay('11/11/2026')).toThrow(InvalidCalendarDayError);
    expect(() => parseCalendarDay('2026-11-11T10:00:00')).toThrow(
      InvalidCalendarDayError,
    );
  });

  it('rechaza fechas de calendario inexistentes', () => {
    expect(() => parseCalendarDay('2026-02-31')).toThrow(InvalidCalendarDayError);
    expect(() => parseCalendarDay('2026-13-01')).toThrow(InvalidCalendarDayError);
  });

  it('arma rango inclusivo/exclusivo para medianoche comercial', () => {
    expect(buildCalendarDayRange('2026-11-11')).toEqual({
      desde: '2026-11-11 00:00:00',
      hastaExclusivo: '2026-11-12 00:00:00',
    });
  });

  it('cruza de mes y de año correctamente', () => {
    expect(buildCalendarDayRange('2026-11-30').hastaExclusivo).toBe(
      '2026-12-01 00:00:00',
    );
    expect(buildCalendarDayRange('2026-12-31').hastaExclusivo).toBe(
      '2027-01-01 00:00:00',
    );
  });
});
