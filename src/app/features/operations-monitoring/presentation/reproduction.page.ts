import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LocaleService } from '../../../core/config/locale.service';
import { OperationsFacade } from '../application/operations.facade';
import { OPERATIONS_PROVIDERS } from '../application/operations.providers';
import { CareRecordInput, RecordKind } from '../domain/operations.models';
import { calendarDayValidator } from './care-form.validators';

type ReproductiveKind = Extract<RecordKind, 'heat' | 'service' | 'calving'>;

interface ReproductionFormControls {
  animalId: FormControl<string>;
  kind: FormControl<ReproductiveKind>;
  occurredAt: FormControl<string>;
  note: FormControl<string>;
}

@Component({
  selector: 'ichu-reproduction-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: OPERATIONS_PROVIDERS,
  templateUrl: './reproduction.page.html',
  styleUrl: './reproduction.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReproductionPage {
  readonly locale = inject(LocaleService);
  readonly facade = inject(OperationsFacade);
  readonly maximumDay = this.facade.workspace.now.slice(0, 10);
  readonly filters = new FormGroup({
    animal: new FormControl('', { nonNullable: true }),
    kind: new FormControl<ReproductiveKind | ''>('', { nonNullable: true }),
  });
  private readonly filterValues = toSignal(this.filters.valueChanges, { initialValue: this.filters.getRawValue() });
  readonly recordForm = new FormGroup<ReproductionFormControls>({
    animalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    kind: new FormControl<ReproductiveKind>('heat', { nonNullable: true, validators: [Validators.required] }),
    occurredAt: new FormControl(this.maximumDay, { nonNullable: true, validators: [Validators.required, calendarDayValidator(this.maximumDay)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(500), Validators.pattern(/\S/)] }),
  });
  readonly availableKinds = computed<readonly ReproductiveKind[]>(() => this.facade.workspace.role() === 'veterinarian' ? ['service'] : ['heat', 'calving']);
  readonly feedbackIsError = signal(false);
  readonly records = computed(() => {
    const filter = this.filterValues();
    return this.facade.reproductiveRecords().filter((record) => (!filter.animal || record.animalId === filter.animal) && (!filter.kind || record.kind === filter.kind));
  });
  readonly heatCount = computed(() => this.facade.reproductiveRecords().filter((record) => record.kind === 'heat').length);
  readonly serviceCount = computed(() => this.facade.reproductiveRecords().filter((record) => record.kind === 'service').length);
  readonly calvingCount = computed(() => this.facade.reproductiveRecords().filter((record) => record.kind === 'calving').length);

  constructor() {
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

  private defaultForm(role: 'rancher' | 'veterinarian'): ReproductionFormControlsValue {
    return { animalId: '', kind: role === 'veterinarian' ? 'service' : 'heat', occurredAt: this.maximumDay, note: '' };
  }

  saveRecord(): void {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const value = this.recordForm.getRawValue();
    const input: CareRecordInput = {
      animalId: value.animalId,
      kind: value.kind,
      occurredAt: value.occurredAt,
      note: value.note,
      product: '',
      dose: '',
      withdrawalStart: '',
      withdrawalEnd: '',
      withdrawalTarget: 'both',
      withdrawalReviewed: false,
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
}

type ReproductionFormControlsValue = {
  [Key in keyof ReproductionFormControls]: ReproductionFormControls[Key] extends FormControl<infer Value> ? Value : never;
};
