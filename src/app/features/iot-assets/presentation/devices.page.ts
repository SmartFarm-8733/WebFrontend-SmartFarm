import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { DevicesFacade } from '../application/devices.facade';
import {
  CollarDevice, ConnectionState, DeviceError, DeviceText, DeviceType, IoTDevice, ReleaseReason,
  connectionAt, isCaptureStale, isLowBattery,
} from '../domain/device.model';
import { DeviceRepository } from '../domain/device.repository';
import { MockDeviceAdapter } from '../infrastructure/mock-device.adapter';

@Component({
  selector: 'ichu-devices-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule],
  providers: [DevicesFacade, { provide: DeviceRepository, useExisting: MockDeviceAdapter }],
  templateUrl: './devices.page.html',
  styleUrl: './devices.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(DevicesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private activeScope = '';

  readonly filtersForm = new FormGroup({
    identifier: new FormControl('', { nonNullable: true }),
    type: new FormControl<DeviceType | 'all'>('all', { nonNullable: true }),
    connection: new FormControl<ConnectionState | 'all'>('all', { nonNullable: true }),
  });
  readonly linkForm = new FormGroup({
    animalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly releaseForm = new FormGroup({
    reason: new FormControl<ReleaseReason | ''>('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly pendingRelease = signal<{ id: string; herdId: string; animalId: string } | null>(null);
  readonly guideOpen = signal(false);
  readonly guideStep = signal(0);
  readonly guideSteps: readonly DeviceText[] = [
    { en: 'Match the printed device ID and inspect the casing and fit.', es: 'Comprueba el identificador impreso y revisa la carcasa y el ajuste.' },
    { en: 'Check the physical power indicator. Follow the manufacturer’s service instructions for a low or empty battery.',
      es: 'Revisa el indicador físico de energía. Sigue las instrucciones del fabricante si la batería está baja o vacía.' },
    { en: 'Check gateway power and coverage, then compare the next received timestamp. Request field support if communication stays absent.',
      es: 'Revisa la energía y cobertura de la pasarela y compara la próxima hora de recepción. Solicita soporte en campo si continúa sin comunicación.' },
  ];

  constructor() {
    this.filtersForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.facade.setFilters(this.filtersForm.getRawValue());
    });
    effect(() => {
      const scope = `${this.workspace.herdId()}:${this.workspace.role()}`;
      this.facade.selected()?.id;
      if (scope !== this.activeScope) {
        this.activeScope = scope;
        this.filtersForm.reset({ identifier: '', type: 'all', connection: 'all' }, { emitEvent: false });
      }
      this.linkForm.reset();
      this.releaseForm.reset();
      this.pendingRelease.set(null);
      this.guideOpen.set(false);
      this.guideStep.set(0);
    });
  }

  clearFilters(): void {
    this.filtersForm.reset({ identifier: '', type: 'all', connection: 'all' });
  }

  typeLabel(type: DeviceType): string {
    switch (type) {
      case 'collar': return this.locale.text('Collar', 'Collar');
      case 'water-controller': return this.locale.text('Water controller', 'Controlador de agua');
      case 'gateway': return this.locale.text('Gateway', 'Pasarela');
    }
  }

  connection(device: IoTDevice): ConnectionState {
    return connectionAt(device, this.workspace.now);
  }

  connectionLabel(device: IoTDevice): string {
    switch (this.connection(device)) {
      case 'online': return this.locale.text('Online', 'En línea');
      case 'offline': return this.locale.text('No connection', 'Sin conexión');
      case 'never-seen': return this.locale.text('Not yet seen', 'Sin comunicación inicial');
    }
  }

  localText(value: DeviceText): string {
    return this.locale.text(value.en, value.es);
  }

  targetLabel(device: IoTDevice): string {
    if (device.type !== 'collar') return this.localText(device.location);
    const animal = device.assignment?.animal;
    return animal ? `${animal.earTag}${animal.name ? ` · ${animal.name}` : ''}` : this.locale.text('Unassigned', 'Sin asignar');
  }

  batteryLabel(device: IoTDevice): string {
    return device.battery === null ? this.locale.text('No battery reading', 'Sin lectura de batería')
      : this.locale.number(device.battery / 100, { style: 'percent', maximumFractionDigits: 0 });
  }

  lowBattery(device: IoTDevice): boolean { return isLowBattery(device); }
  stale(device: IoTDevice): boolean { return isCaptureStale(device, this.workspace.now); }

  date(value: string | null): string {
    return value === null ? this.locale.text('No reading', 'Sin lectura')
      : this.locale.date(value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
  }

  temperature(value: number | null): string {
    return value === null ? this.locale.text('No reading', 'Sin lectura')
      : `${this.locale.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`;
  }

  capturedBeforeAssignment(device: CollarDevice): boolean {
    return device.assignment !== null && device.capturedAt !== null
      && Date.parse(device.capturedAt) < Date.parse(device.assignment.startedAt);
  }

  link(device: CollarDevice): void {
    this.linkForm.markAllAsTouched();
    if (this.linkForm.invalid || this.facade.readOnly()) return;
    if (this.facade.link(device.id, this.linkForm.controls.animalId.value, device.herdId)) this.linkForm.reset();
  }

  requestRelease(device: CollarDevice): void {
    if (!device.assignment || this.facade.readOnly()) return;
    this.releaseForm.reset();
    this.pendingRelease.set({ id: device.id, herdId: device.herdId, animalId: device.assignment.animal.id });
  }

  confirmRelease(device: CollarDevice): void {
    this.releaseForm.markAllAsTouched();
    const pending = this.pendingRelease();
    const reason = this.releaseForm.controls.reason.value;
    if (!pending || pending.id !== device.id || pending.herdId !== device.herdId
      || pending.animalId !== device.assignment?.animal.id || reason === '' || this.facade.readOnly()) return;
    if (this.facade.release(device.id, reason, pending.herdId)) this.pendingRelease.set(null);
  }

  reasonLabel(reason: ReleaseReason | null): string {
    switch (reason) {
      case 'maintenance': return this.locale.text('Maintenance', 'Mantenimiento');
      case 'animal-left-herd': return this.locale.text('Animal left herd', 'Animal retirado del hato');
      case 'replacement': return this.locale.text('Replacement', 'Reemplazo');
      case null: return this.locale.text('Open assignment', 'Asignación vigente');
    }
  }

  messageText(message: 'linked' | 'released' | DeviceError): string {
    const messages: Record<'linked' | 'released' | DeviceError, DeviceText> = {
      linked: { en: 'Collar linked in this demo.', es: 'Collar vinculado en esta demo.' },
      released: { en: 'Collar released. Assignment history preserved.', es: 'Collar liberado. Se conservó el historial de asignación.' },
      'read-only': { en: 'Veterinary access is read-only.', es: 'El acceso veterinario es de solo lectura.' },
      unauthorized: { en: 'Select an authorized herd.', es: 'Selecciona un hato autorizado.' },
      'device-not-found': { en: 'Device not found in this herd.', es: 'No se encontró el dispositivo en este hato.' },
      'not-collar': { en: 'Only collars can be linked to animals.', es: 'Solo los collares se vinculan a animales.' },
      'already-assigned': { en: 'Release the current assignment first.', es: 'Libera primero la asignación actual.' },
      'animal-not-found': { en: 'Choose a known demo animal in this herd.', es: 'Elige un animal conocido de este hato en la demo.' },
      'animal-already-linked': { en: 'This animal already has a collar.', es: 'Este animal ya tiene un collar.' },
      'plan-limit': { en: 'The demo collar allowance is full. Release a collar first.', es: 'Se alcanzó el límite de collares de la demo. Libera un collar primero.' },
      'not-assigned': { en: 'This collar is already unassigned.', es: 'Este collar ya está sin asignar.' },
      'reason-required': { en: 'Choose a release reason.', es: 'Elige un motivo para liberar.' },
      'invalid-time': { en: 'The assignment time is invalid.', es: 'La hora de asignación no es válida.' },
    };
    return this.localText(messages[message]);
  }
}
