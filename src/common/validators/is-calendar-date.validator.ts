import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { parseCalendarDay } from '../utils/calendar-day-range.util.js';

/** Valida fecha calendario real en formato YYYY-MM-DD. */
export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') {
            return true;
          }
          if (typeof value !== 'string') {
            return false;
          }
          try {
            parseCalendarDay(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(_args: ValidationArguments) {
          return 'fecha debe ser una fecha real en formato YYYY-MM-DD';
        },
      },
    });
  };
}
