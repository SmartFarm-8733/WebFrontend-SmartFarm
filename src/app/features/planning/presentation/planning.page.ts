import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, ValidatorFn } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Routes } from '@angular/router';
import { LocaleService } from '../../../core/config/locale.service';
import { PlanningFacade } from '../application/planning.facade';
import { CampaignType, DisplayStatus, HealthCampaign, LocalizedName, PlanningError, dateValue, shiftDate, withdrawalOverlaps } from '../domain/planning.models';
import { PlanningRepository } from '../domain/planning.repository';
import { MockPlanningAdapter } from '../infrastructure/mock-planning.adapter';

@Component({
  selector: 'ichu-planning-page', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './planning.page.html', styleUrl: './planning.page.scss', changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlanningFacade, { provide: PlanningRepository, useExisting: MockPlanningAdapter }],
})
export class PlanningPage {
  readonly locale = inject(LocaleService);
  readonly planning = inject(PlanningFacade);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly showForm = signal(false);
  readonly discardPending = signal(false);
  readonly activeCampaignId = signal<string | null>(null);
  readonly activeCampaign = computed(() => this.planning.snapshot().campaigns.find(campaign => campaign.id === this.activeCampaignId()));
  readonly applicationAnimal = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  private readonly nameValidator: ValidatorFn = control => typeof control.value === 'string' && control.value.trim().length > 0 ? null : { blank: true };
  private readonly dateValidator: ValidatorFn = control => typeof control.value === 'string' && Number.isFinite(dateValue(control.value)) && control.value >= this.planning.today ? null : { past: true };
  private readonly integerValidator: ValidatorFn = control => typeof control.value === 'number' && Number.isInteger(control.value) ? null : { integer: true };
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [this.nameValidator, Validators.maxLength(80)] }),
    lotId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(this.planning.today, { nonNullable: true, validators: [this.dateValidator] }),
    type: new FormControl<CampaignType>('vaccination', { nonNullable: true }),
    animalCount: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1), this.integerValidator] }),
    leadDays: new FormControl(3, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(30), this.integerValidator] }),
  });
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly chosenLot = computed(() => this.planning.snapshot().lots.find(lot => lot.id === this.formValue().lotId));
  readonly availableAnimals = computed(() => this.chosenLot()?.animals.filter(animal => animal.active) ?? []);
  readonly formOverlaps = computed(() => withdrawalOverlaps(this.planning.context().herdId,
    this.availableAnimals().slice(0, this.formValue().animalCount ?? 0).map(animal => animal.id), this.formValue().date ?? '', this.planning.snapshot().withdrawals));
  readonly monthTitle = computed(() => { this.locale.locale(); return this.locale.date(new Date(`${this.planning.month()}T12:00:00Z`), { month: 'long', year: 'numeric', day: undefined, timeZone: 'UTC' }); });
  readonly weekdays = computed(() => { this.locale.locale(); return Array.from({ length: 7 }, (_, index) => this.locale.date(new Date(`${shiftDate('2026-10-05', index)}T12:00:00Z`), { weekday: 'short', day: undefined, month: undefined, year: undefined, timeZone: 'UTC' })); });
  readonly listEntries = computed(() => this.planning.view() === 'agenda' ? this.planning.monthEntries() : this.planning.dayEntries());
  readonly statusOptions: readonly (DisplayStatus | 'all')[] = ['all', 'scheduled', 'in-progress', 'overdue', 'completed', 'not-applicable'];
  readonly typeOptions: readonly CampaignType[] = ['vaccination', 'parasite-control', 'general-care'];

  constructor() {
    effect(() => {
      this.planning.context();
      untracked(() => { this.showForm.set(false); this.discardPending.set(false); this.activeCampaignId.set(null); this.applicationAnimal.reset(); this.form.reset({ name: '', lotId: '', date: this.planning.today, type: 'vaccination', animalCount: 1, leadDays: 3 }); });
    });
    effect(() => {
      const max = this.availableAnimals().length;
      this.form.controls.animalCount.setValidators([Validators.required, Validators.min(1), Validators.max(max), this.integerValidator]);
      this.form.controls.animalCount.updateValueAndValidity({ emitEvent: false });
    });
  }
  name(value: LocalizedName): string { return this.locale.text(value.en, value.es); }
  date(value: string): string { return this.locale.date(new Date(`${value}T12:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  lotName(id: string): string { const lot = this.planning.snapshot().lots.find(item => item.id === id); return lot ? this.name(lot.name) : this.locale.text('Lot unavailable', 'Lote no disponible'); }
  typeName(type: CampaignType): string {
    return type === 'vaccination' ? this.locale.text('Vaccination', 'Vacunación') : type === 'parasite-control' ? this.locale.text('Parasite control', 'Control de parásitos') : this.locale.text('General care', 'Atención general');
  }
  statusName(status: DisplayStatus | 'all'): string {
    const labels: Record<DisplayStatus | 'all', readonly [string, string]> = { all: ['All statuses', 'Todos los estados'], scheduled: ['Scheduled', 'Programado'], 'in-progress': ['In progress', 'En curso'], overdue: ['Overdue', 'Vencido'], completed: ['Completed', 'Completado'], 'not-applicable': ['Not applicable', 'No aplica'] };
    return this.locale.text(...labels[status]);
  }
  statusClass(status: DisplayStatus): string { return status === 'overdue' ? 'danger' : status === 'completed' ? 'success' : status === 'in-progress' ? 'warning' : 'neutral'; }
  errorText(error: PlanningError): string {
    const labels: Record<PlanningError, readonly [string, string]> = {
      forbidden: ['Only the ranch manager can change this calendar.', 'Solo el administrador ganadero puede cambiar este calendario.'],
      name: ['Enter a name of up to 80 characters.', 'Ingresa un nombre de hasta 80 caracteres.'], lot: ['Choose an available lot.', 'Selecciona un lote disponible.'],
      date: ['Choose today or a later date.', 'Selecciona hoy o una fecha posterior.'], timestamp: ['The application time is invalid. Try again.', 'La hora de la aplicación no es válida. Inténtalo de nuevo.'],
      animals: ['Choose a whole number within the active lot size.', 'Elige un número entero dentro del tamaño del lote activo.'],
      reminder: ['Choose a reminder from 0 to 30 days before.', 'Elige un aviso de 0 a 30 días antes.'], missing: ['This record is unavailable. Select it again.', 'Este registro no está disponible. Selecciónalo de nuevo.'],
      duplicate: ['This animal already has an application recorded.', 'Este animal ya tiene una aplicación registrada.'], future: ['Applications open on the campaign date.', 'Las aplicaciones se habilitan en la fecha de la campaña.'], completed: ['This campaign is already complete.', 'Esta campaña ya está completa.'],
    };
    return this.locale.text(...labels[error]);
  }
  noticeText(): string {
    switch (this.planning.notice()) {
      case 'scheduled': return this.locale.text('Campaign saved in the demo calendar.', 'Campaña guardada en el calendario de demostración.');
      case 'applied': return this.locale.text('Application recorded. Progress updated.', 'Aplicación registrada. Avance actualizado.');
      case 'reminder': return this.locale.text('Reminder marked as read.', 'Recordatorio marcado como leído.');
      default: return '';
    }
  }
  dayLabel(date: string, count: number): string { return `${this.date(date)}. ${this.locale.number(count)} ${this.locale.text('activities', 'actividades')}`; }
  setQuery(event: Event): void { if (event.target instanceof HTMLInputElement) this.planning.query.set(event.target.value); }
  setStatus(event: Event): void {
    if (event.target instanceof HTMLSelectElement) { const status = this.statusOptions.find(value => value === (event.target as HTMLSelectElement).value); if (status) this.planning.status.set(status); }
  }
  openForm(): void {
    if (!this.planning.canEdit()) return;
    this.form.reset({ name: '', lotId: this.planning.snapshot().lots[0]?.id ?? '', date: this.planning.selectedDay() < this.planning.today ? this.planning.today : this.planning.selectedDay(), type: 'vaccination', animalCount: 1, leadDays: 3 });
    this.planning.error.set(null); this.discardPending.set(false); this.showForm.set(true);
    setTimeout(() => this.element.nativeElement.querySelector<HTMLInputElement>('#campaign-name')?.focus());
  }
  requestClose(): void { if (this.form.dirty) this.discardPending.set(true); else this.closeForm(); }
  closeForm(): void { this.showForm.set(false); this.discardPending.set(false); setTimeout(() => this.element.nativeElement.querySelector<HTMLButtonElement>('#schedule-campaign')?.focus()); }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.planning.canEdit()) return;
    if (this.planning.schedule(this.form.getRawValue())) { this.form.markAsPristine(); this.closeForm(); }
  }
  openApplications(campaign: HealthCampaign): void {
    this.activeCampaignId.set(campaign.id); this.applicationAnimal.setValue(this.pendingAnimals(campaign)[0]?.id ?? '');
    setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>('#campaign-detail')?.focus());
  }
  pendingAnimals(campaign: HealthCampaign) {
    return this.planning.snapshot().lots.flatMap(lot => lot.animals).filter(animal => campaign.animalIds.includes(animal.id) && !campaign.applications.some(application => application.animalId === animal.id));
  }
  recordApplication(campaign: HealthCampaign): void {
    if (this.applicationAnimal.invalid || !this.planning.canEdit()) return;
    if (this.planning.apply(campaign.id, this.applicationAnimal.value)) {
      const updated = this.activeCampaign(); this.applicationAnimal.setValue(updated ? this.pendingAnimals(updated)[0]?.id ?? '' : '');
    }
  }
  calendarKey(event: KeyboardEvent, date: string): void {
    const shifts: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string;
    if (event.key in shifts) target = shiftDate(date, shifts[event.key]);
    else if (event.key === 'Home' || event.key === 'End') {
      const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
      target = shiftDate(date, event.key === 'Home' ? -weekday : 6 - weekday);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault(); this.planning.moveMonth(event.key === 'PageUp' ? -1 : 1); target = this.planning.selectedDay();
    } else return;
    event.preventDefault(); this.planning.selectDay(target);
    setTimeout(() => this.element.nativeElement.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus());
  }
}

/** Parent may lazy-load these child routes beneath its /planning shell route. */
export const PLANNING_ROUTES: Routes = [{ path: '', component: PlanningPage }];
