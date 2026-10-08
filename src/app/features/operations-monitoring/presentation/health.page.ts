import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LocaleService } from '../../../core/config/locale.service';
import { OperationsFacade } from '../application/operations.facade';
import { OPERATIONS_PROVIDERS } from '../application/operations.providers';
import { CareRecordInput, RecordKind } from '../domain/operations.models';
import { calendarDayValidator, withdrawalDateRangeValidator } from './care-form.validators';

type HealthRecordKind = 'observation' | 'treatment' | 'vaccination' | 'review';
type WithdrawalTarget = 'milk' | 'meat' | 'both';

interface HealthFormControls {
  animalId: FormControl<string>;
  kind: FormControl<HealthRecordKind>;
  occurredAt: FormControl<string>;
  note: FormControl<string>;
  product: FormControl<string>;
  dose: FormControl<string>;
  withdrawalStart: FormControl<string>;
  withdrawalEnd: FormControl<string>;
  withdrawalTarget: FormControl<WithdrawalTarget>;
  withdrawalReviewed: FormControl<boolean>;
}

@Component({
  selector: 'ichu-health-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: OPERATIONS_PROVIDERS,
  templateUrl: './health.page.html',
  styleUrl: './health.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthPage {
  readonly locale = inject(LocaleService);
  readonly facade = inject(OperationsFacade);
  readonly maximumDay = this.facade.workspace.now.slice(0, 10);
  readonly filters = new FormGroup({
    animal: new FormControl('', { nonNullable: true }),
    kind: new FormControl<HealthRecordKind | ''>('', { nonNullable: true }),
  });
  private readonly filterValues = toSignal(this.filters.valueChanges, { initialValue: this.filters.getRawValue() });
  readonly recordForm = new FormGroup<HealthFormControls>({
    animalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    kind: new FormControl<HealthRecordKind>('observation', { nonNullable: true, validators: [Validators.required] }),
    occurredAt: new FormControl(this.maximumDay, { nonNullable: true, validators: [Validators.required, calendarDayValidator(this.maximumDay)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(500), Validators.pattern(/\S/)] }),
    product: new FormControl('', { nonNullable: true }),
    dose: new FormControl('', { nonNullable: true }),
    withdrawalStart: new FormControl(this.maximumDay, { nonNullable: true }),
    withdrawalEnd: new FormControl(this.maximumDay, { nonNullable: true }),
    withdrawalTarget: new FormControl<WithdrawalTarget>('both', { nonNullable: true }),
    withdrawalReviewed: new FormControl(false, { nonNullable: true }),
  }, { validators: [withdrawalDateRangeValidator] });
  readonly recordKind = toSignal(this.recordForm.controls.kind.valueChanges, { initialValue: this.recordForm.controls.kind.value });
  readonly requiresWithdrawal = computed(() => this.isAdministered(this.recordKind()));
  readonly availableKinds = computed<readonly HealthRecordKind[]>(() => this.facade.workspace.role() === 'veterinarian' ? ['treatment', 'vaccination', 'review'] : ['observation']);
  readonly feedbackIsError = signal(false);
  readonly healthRecords = computed(() => {
    const filter = this.filterValues();
    return this.facade.healthRecords().filter((record) => (!filter.animal || record.animalId === filter.animal) && (!filter.kind || record.kind === filter.kind));
  });
  readonly activeWithdrawals = computed(() => this.facade.healthRecords().filter((record) => !!record.withdrawalStart && !!record.withdrawalEnd && record.withdrawalStart <= this.maximumDay && record.withdrawalEnd >= this.maximumDay));
  readonly activeWithdrawalAnimals = computed(() => new Set(this.activeWithdrawals().map((record) => record.animalId)).size);

  constructor() {
    this.recordForm.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => this.configureKind(kind));
    this.configureKind(this.recordForm.controls.kind.value);
    effect(() => {
      const role = this.facade.workspace.role();
      this.facade.workspace.herdId();
      untracked(() => {
        this.filters.reset({ animal: '', kind: '' });
        this.recordForm.reset(this.defaultForm(role));
        this.facade.feedback.set(null);
        this.feedbackIsError.set(false);
      });
    });
  }

  private defaultForm(role: 'rancher' | 'veterinarian'): HealthFormControlsValue {
    return { animalId: '', kind: role === 'veterinarian' ? 'review' : 'observation', occurredAt: this.maximumDay, note: '', product: '', dose: '', withdrawalStart: this.maximumDay, withdrawalEnd: this.maximumDay, withdrawalTarget: 'both', withdrawalReviewed: false };
  }

  private configureKind(kind: HealthRecordKind): void {
    const administered = this.isAdministered(kind);
    this.recordForm.controls.product.setValidators(administered ? [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)] : []);
    this.recordForm.controls.dose.setValidators(administered ? [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)] : []);
    this.recordForm.controls.withdrawalStart.setValidators(administered ? [Validators.required, calendarDayValidator(this.maximumDay)] : []);
    this.recordForm.controls.withdrawalEnd.setValidators(administered ? [Validators.required, calendarDayValidator()] : []);
    this.recordForm.controls.withdrawalTarget.setValidators(administered ? [Validators.required] : []);
    this.recordForm.controls.product.updateValueAndValidity({ emitEvent: false });
    this.recordForm.controls.dose.updateValueAndValidity({ emitEvent: false });
    this.recordForm.controls.withdrawalStart.updateValueAndValidity({ emitEvent: false });
    this.recordForm.controls.withdrawalEnd.updateValueAndValidity({ emitEvent: false });
    this.recordForm.controls.withdrawalTarget.updateValueAndValidity({ emitEvent: false });
    this.recordForm.updateValueAndValidity({ emitEvent: false });
  }

  private isAdministered(kind: HealthRecordKind): boolean {
    return kind === 'treatment' || kind === 'vaccination';
  }

  saveRecord(): void {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const value = this.recordForm.getRawValue();
    const administered = this.isAdministered(value.kind);
    const input: CareRecordInput = {
      animalId: value.animalId,
      kind: value.kind as RecordKind,
      occurredAt: value.occurredAt,
      note: value.note,
      product: administered ? value.product : '',
      dose: administered ? value.dose : '',
      withdrawalStart: administered ? value.withdrawalStart : '',
      withdrawalEnd: administered ? value.withdrawalEnd : '',
      withdrawalTarget: value.withdrawalTarget,
      withdrawalReviewed: value.withdrawalReviewed,
    };
    const saved = this.facade.record(input);
    this.feedbackIsError.set(!saved);
    if (saved) this.recordForm.reset(this.defaultForm(this.facade.workspace.role()));
  }

  clearFilters(): void {
    this.filters.reset({ animal: '', kind: '' });
  }

  animalName(animalId: string): string {
    return this.facade.animals().find((animal) => animal.id === animalId)?.name ?? this.locale.text('Animal unavailable', 'Animal no disponible');
  }

  withdrawalTargetLabel(target: WithdrawalTarget | null): string {
    if (!target) return this.locale.text('Not recorded', 'Sin registrar');
    return this.locale.text({ milk: 'Milk', meat: 'Meat', both: 'Milk and meat' }[target], { milk: 'Leche', meat: 'Carne', both: 'Leche y carne' }[target]);
  }
}

type HealthFormControlsValue = {
  [Key in keyof HealthFormControls]: HealthFormControls[Key] extends FormControl<infer Value> ? Value : never;
};
