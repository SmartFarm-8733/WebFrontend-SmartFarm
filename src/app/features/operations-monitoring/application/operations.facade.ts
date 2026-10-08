import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { OperationsRepository } from '../domain/operations.repository';
import { AlertPriority, AlertStatus, AnimalReading, CareRecordInput, Copy, EMPTY_OPERATIONS, Freshness, OperationError, OperationResult, readingFreshness, RecordKind, REPRODUCTIVE_KINDS } from '../domain/operations.models';

@Injectable()
export class OperationsFacade {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  private readonly repository = inject(OperationsRepository);
  private readonly snapshot = signal(EMPTY_OPERATIONS);
  readonly animal = signal('');
  readonly priority = signal<AlertPriority | ''>('');
  readonly status = signal<AlertStatus | ''>('');
  readonly category = signal('');
  readonly feedback = signal<Copy | null>(null);
  readonly animals = computed(() => this.snapshot().animals);
  readonly lots = computed(() => this.snapshot().lots);
  readonly selectedAnimal = computed(() => this.animals().find((animal) => animal.id === this.animal()) ?? this.animals()[0] ?? null);
  readonly allAlerts = computed(() => this.snapshot().alerts);
  readonly alerts = computed(() => this.allAlerts().filter((alert) => (!this.animal() || alert.animalId === this.animal()) && (!this.priority() || alert.priority === this.priority()) && (!this.status() || alert.status === this.status()) && (!this.category() || alert.category === this.category())).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority] || Date.parse(b.raisedAt) - Date.parse(a.raisedAt))));
  readonly records = computed(() => this.snapshot().records.filter((record) => !this.animal() || record.animalId === this.animal()).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)));
  readonly healthRecords = computed(() => this.records().filter((record) => !REPRODUCTIVE_KINDS.includes(record.kind)));
  readonly reproductiveRecords = computed(() => this.records().filter((record) => REPRODUCTIVE_KINDS.includes(record.kind)));
  readonly withdrawals = computed(() => this.records().filter((record) => !!record.withdrawalStart && !!record.withdrawalEnd && record.withdrawalStart <= this.workspace.now.slice(0, 10) && record.withdrawalEnd >= this.workspace.now.slice(0, 10)));
  readonly openCount = computed(() => this.allAlerts().filter((alert) => alert.status !== 'resolved').length);
  readonly recentCount = computed(() => this.animals().filter((animal) => this.freshness(animal) === 'recent').length);
  readonly unknownCount = computed(() => this.animals().filter((animal) => this.freshness(animal) !== 'recent').length);

  constructor() {
    effect(() => {
      const herdId = this.workspace.herdId();
      const role = this.workspace.role();
      untracked(() => {
        this.clearFilters();
        this.feedback.set(null);
        this.snapshot.set(this.repository.read(herdId, role));
      });
    });
    const unsubscribe = this.repository.subscribe(() => this.snapshot.set(this.repository.read(this.workspace.herdId(), this.workspace.role())));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  clearFilters(): void { this.animal.set(''); this.priority.set(''); this.status.set(''); this.category.set(''); }
  copy(value: Copy): string { return this.locale.text(value.en, value.es); }
  freshness(animal: AnimalReading): Freshness { return readingFreshness(animal, this.workspace.now); }
  captured(value: string | null): string { return value ? this.locale.date(value, { dateStyle: 'medium', timeStyle: 'short' }) : this.locale.text('No reading', 'Sin lectura'); }
  day(value: string | null): string { return value ? this.locale.date(`${value}T12:00:00-05:00`, { dateStyle: 'medium' }) : this.locale.text('Not recorded', 'Sin registrar'); }
  freshnessLabel(state: Freshness): string {
    const labels: Record<Freshness, Copy> = { recent: { en: 'Recent reading', es: 'Lectura reciente' }, stale: { en: 'Stale reading', es: 'Lectura antigua' }, disconnected: { en: 'Disconnected · last reading', es: 'Sin conexión · última lectura' }, missing: { en: 'No data', es: 'Sin datos' } };
    return this.copy(labels[state]);
  }
  statusLabel(status: AlertStatus): string { return this.copy({ open: { en: 'Open', es: 'Abierta' }, acknowledged: { en: 'Acknowledged', es: 'En atención' }, resolved: { en: 'Resolved', es: 'Resuelta' } }[status]); }
  priorityLabel(priority: AlertPriority): string { return this.copy({ high: { en: 'High', es: 'Alta' }, medium: { en: 'Medium', es: 'Media' }, low: { en: 'Low', es: 'Baja' } }[priority]); }
  kindLabel(kind: RecordKind): string { return this.copy({ observation: { en: 'Field observation', es: 'Observación de campo' }, treatment: { en: 'Treatment', es: 'Tratamiento' }, vaccination: { en: 'Vaccination', es: 'Vacunación' }, review: { en: 'Clinical review', es: 'Revisión clínica' }, heat: { en: 'Possible heat · field record', es: 'Posible celo · registro de campo' }, service: { en: 'Service record', es: 'Registro de servicio' }, calving: { en: 'Calving observed', es: 'Parto observado' } }[kind]); }
  author(value: string): string { return value === 'Rancher' ? this.locale.text('Rancher', 'Ganadero') : value; }
  respond(id: string, status: Exclude<AlertStatus, 'open'>, note: string): boolean {
    return this.finish(this.repository.respond(this.workspace.herdId(), this.workspace.role(), id, status, note, this.workspace.now), { en: 'Response saved. No notification was sent.', es: 'Respuesta guardada. No se envió una notificación.' });
  }
  record(input: CareRecordInput): boolean {
    return this.finish(this.repository.record(this.workspace.herdId(), this.workspace.role(), input, this.workspace.now), { en: 'Record saved. Clinical decisions remain with the veterinarian.', es: 'Registro guardado. Las decisiones clínicas corresponden al veterinario.' });
  }
  private finish(result: OperationResult, success: Copy): boolean {
    const errors: Record<OperationError, Copy> = {
      access: { en: 'This role cannot save this record in this herd.', es: 'Este rol no puede guardar este registro en este hato.' }, animal: { en: 'Select an animal from the current herd.', es: 'Selecciona un animal del hato actual.' }, required: { en: 'Complete the required fields. Notes need 5–500 characters.', es: 'Completa los campos obligatorios. La nota requiere 5–500 caracteres.' }, date: { en: 'Use a valid date on or before the workspace date.', es: 'Usa una fecha válida hasta la fecha del espacio de trabajo.' }, withdrawal: { en: 'Review withdrawal dates: start on or after the intervention, end on or after start.', es: 'Revisa las fechas de retiro: inicio desde la intervención y fin desde el inicio.' }, 'withdrawal-review': { en: 'This product has an overlapping withdrawal period. Review it and confirm before saving.', es: 'Este producto tiene un retiro superpuesto. Revísalo y confirma antes de guardar.' }, transition: { en: 'Acknowledge an open alert before resolving it.', es: 'Atiende una alerta abierta antes de resolverla.' },
    };
    this.feedback.set(result.ok ? success : errors[result.error]);
    return result.ok;
  }
}
