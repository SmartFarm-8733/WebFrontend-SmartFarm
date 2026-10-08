import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LocaleService } from '../../../core/config/locale.service';
import { OperationsFacade } from '../application/operations.facade';
import { OPERATIONS_PROVIDERS } from '../application/operations.providers';
import { AlertPriority, AlertStatus, MonitoringAlert } from '../domain/operations.models';

const priorityOrder: Record<AlertPriority, number> = { high: 0, medium: 1, low: 2 };

@Component({
  selector: 'ichu-alerts-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: OPERATIONS_PROVIDERS,
  templateUrl: './alerts.page.html',
  styleUrl: './alerts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  readonly locale = inject(LocaleService);
  readonly facade = inject(OperationsFacade);
  readonly filters = new FormGroup({
    animal: new FormControl('', { nonNullable: true }),
    priority: new FormControl<AlertPriority | ''>('', { nonNullable: true }),
    category: new FormControl<MonitoringAlert['category'] | ''>('', { nonNullable: true }),
    status: new FormControl<AlertStatus | ''>('', { nonNullable: true }),
  });
  private readonly filterValues = toSignal(this.filters.valueChanges, { initialValue: this.filters.getRawValue() });
  readonly responseForm = new FormGroup({
    note: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(500)] }),
  });
  readonly responseAlertId = signal<string | null>(null);
  readonly responseAction = signal<Exclude<AlertStatus, 'open'> | null>(null);
  readonly feedbackIsError = signal(false);
  readonly alerts = computed(() => {
    const filter = this.filterValues();
    return this.facade.allAlerts()
      .filter((alert) => (!filter.animal || alert.animalId === filter.animal)
        && (!filter.priority || alert.priority === filter.priority)
        && (!filter.category || alert.category === filter.category)
        && (!filter.status || alert.status === filter.status))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || Date.parse(b.raisedAt) - Date.parse(a.raisedAt));
  });
  readonly openCount = computed(() => this.facade.allAlerts().filter((alert) => alert.status === 'open').length);
  readonly acknowledgedCount = computed(() => this.facade.allAlerts().filter((alert) => alert.status === 'acknowledged').length);
  readonly highPriorityCount = computed(() => this.facade.allAlerts().filter((alert) => alert.priority === 'high' && alert.status !== 'resolved').length);

  categoryLabel(category: MonitoringAlert['category']): string {
    return this.locale.text(
      { temperature: 'Temperature', activity: 'Activity', location: 'Location' }[category],
      { temperature: 'Temperatura', activity: 'Actividad', location: 'Ubicación' }[category],
    );
  }

  beginResponse(alert: MonitoringAlert): void {
    this.responseAlertId.set(alert.id);
    this.responseAction.set(alert.status === 'open' ? 'acknowledged' : 'resolved');
    this.responseForm.reset({ note: '' });
    this.facade.feedback.set(null);
    this.feedbackIsError.set(false);
  }

  cancelResponse(): void {
    this.responseAlertId.set(null);
    this.responseAction.set(null);
    this.responseForm.reset({ note: '' });
    this.facade.feedback.set(null);
    this.feedbackIsError.set(false);
  }

  submitResponse(alertId: string): void {
    if (this.responseForm.invalid || this.responseAlertId() !== alertId || !this.responseAction()) {
      this.responseForm.markAllAsTouched();
      return;
    }

    const saved = this.facade.respond(alertId, this.responseAction()!, this.responseForm.controls.note.value);
    this.feedbackIsError.set(!saved);
    if (saved) {
      this.responseAlertId.set(null);
      this.responseAction.set(null);
      this.responseForm.reset({ note: '' });
    }
  }

  clearFilters(): void {
    this.filters.reset({ animal: '', priority: '', category: '', status: '' });
  }
}
