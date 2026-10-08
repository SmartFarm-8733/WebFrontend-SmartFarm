import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { validDay } from '../domain/operations.models';

export function calendarDayValidator(maximumDay: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    if (!value) return null;
    if (!validDay(value)) return { calendarDay: true };
    return value > maximumDay ? { futureDay: true } : null;
  };
}

export function withdrawalDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as { kind?: string; occurredAt?: string; withdrawalStart?: string; withdrawalEnd?: string };
  if (value.kind !== 'treatment' && value.kind !== 'vaccination') return null;

  const errors: ValidationErrors = {};
  if (value.occurredAt && value.withdrawalStart && value.withdrawalStart < value.occurredAt) errors['withdrawalBeforeRecord'] = true;
  if (value.withdrawalStart && value.withdrawalEnd && value.withdrawalEnd < value.withdrawalStart) errors['withdrawalEndBeforeStart'] = true;
  return Object.keys(errors).length ? errors : null;
}
