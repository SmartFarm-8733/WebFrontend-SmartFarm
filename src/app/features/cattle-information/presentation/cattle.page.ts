import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { CattleFacade } from '../application/cattle.facade';
import type { CattleFilters } from '../application/cattle.facade';
import { CattleRepository } from '../domain/cattle.repository';
import { validDate, validStageForSex } from '../domain/cattle';
import type { LifeStage, Lot, Sex } from '../domain/cattle';
import { CattleMockRepository } from '../infrastructure/cattle.mock.repository';

@Component({
  selector: 'ichu-cattle-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  providers: [{ provide: CattleRepository, useExisting: CattleMockRepository }, CattleFacade],
  templateUrl: './cattle.page.html',
  styleUrl: './cattle.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CattlePage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(CattleFacade);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly pageSize = 6;
  readonly page = signal(1);
  readonly registrationOpen = signal(false);
  readonly registeredId = signal<string | null>(null);
  readonly today = this.workspace.now.slice(0, 10);
  readonly filtersForm = this.fb.group({ search: '', lot: this.fb.control<Lot | ''>(''),
    stage: this.fb.control<LifeStage | ''>(''), status: this.fb.control<CattleFilters['status']>('active') });
  private readonly filters = toSignal(this.filtersForm.valueChanges.pipe(map(() => this.filtersForm.getRawValue())),
    { initialValue: this.filtersForm.getRawValue() });
  readonly filtered = computed(() => this.facade.select(this.filters()));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly currentPage = computed(() => Math.min(this.page(), this.pages()));
  readonly visible = computed(() => this.filtered().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize));
  readonly rangeStart = computed(() => this.filtered().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0);
  readonly rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filtered().length));
  readonly registrationForm = this.fb.group({
    tag: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9-]{2,19}$/)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    breed: ['Holstein', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    sex: this.fb.control<Sex>('female', Validators.required),
    stage: this.fb.control<LifeStage>('calf', Validators.required),
    lot: this.fb.control<Lot>('lot-01', Validators.required),
    birthDate: ['', [Validators.required, control => validDate(String(control.value), this.workspace.now) ? null : { date: true }]],
  });
  private readonly registration = toSignal(this.registrationForm.valueChanges.pipe(map(() => this.registrationForm.getRawValue())),
    { initialValue: this.registrationForm.getRawValue() });
  readonly stages = computed(() => this.facade.availableStages(this.registration().sex));
  readonly stageCompatible = computed(() => validStageForSex(this.registration().stage, this.registration().sex));

  constructor() {
    effect(() => { this.filters(); this.page.set(1); });
    effect(() => {
      this.workspace.herdId(); this.workspace.role();
      this.filtersForm.reset({ search: '', lot: '', stage: '', status: 'active' });
      this.registrationForm.reset(); this.registrationOpen.set(false); this.registeredId.set(null);
    });
  }

  toggleRegistration(): void {
    if (!this.facade.writable()) return;
    this.registrationOpen.update(open => !open);
    this.facade.result.set(null);
  }

  register(): void {
    this.registrationForm.markAllAsTouched();
    if (!this.facade.writable() || this.registrationForm.invalid || !this.stageCompatible()) return;
    if (this.facade.register(this.registrationForm.getRawValue())) {
      const result = this.facade.result();
      this.registeredId.set(result?.ok ? result.value.id : null);
      this.registrationOpen.set(false); this.registrationForm.reset();
      this.filtersForm.reset({ search: '', lot: '', stage: '', status: 'active' });
    }
  }

  invalid(field: keyof typeof this.registrationForm.controls): boolean {
    const control = this.registrationForm.controls[field];
    return control.touched && control.invalid;
  }

  resetFilters(): void { this.filtersForm.reset({ search: '', lot: '', stage: '', status: 'active' }); }
  previous(): void { this.page.set(Math.max(1, this.currentPage() - 1)); }
  next(): void { this.page.set(Math.min(this.pages(), this.currentPage() + 1)); }
}
