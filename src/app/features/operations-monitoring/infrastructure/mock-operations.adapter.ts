import { Injectable, signal } from '@angular/core';
import { OperationsRepository } from '../domain/operations.repository';
import { AlertStatus, AnimalReading, CareRecordInput, CLINICAL_KINDS, EMPTY_OPERATIONS, HerdRole, OperationResult, OperationsSnapshot, validDay } from '../domain/operations.models';

function seed(herdId: string): OperationsSnapshot {
  const pucara = herdId === 'pucara';
  const profiles = pucara
    ? [
      { id: 'ICH-118', name: 'Luna', lot: { en: 'Lot 03 · pasture', es: 'Lote 03 · pastoreo' } },
      { id: 'ICH-210', name: 'Inti', lot: { en: 'Lot 01 · pasture', es: 'Lote 01 · pastoreo' } },
    ]
    : [
      { id: 'ICH-014', name: 'Napoleón', lot: { en: 'Breeding · Lot 03', es: 'Reproductores · Lote 03' } },
      { id: 'ICH-089', name: 'María', lot: { en: 'Lot 03 · pasture', es: 'Lote 03 · pastoreo' } },
      { id: 'ICH-118', name: 'Lucero', lot: { en: 'Lot 03 · pasture', es: 'Lote 03 · pastoreo' } },
      { id: 'ICH-201', name: 'Alba', lot: { en: 'Lot 01 · pasture', es: 'Lote 01 · pastoreo' } },
    ];
  const ids = profiles.map((animal) => animal.id);
  const clinicalAnimalId = ids[pucara ? 0 : 2];
  const fieldAnimalId = ids[pucara ? 1 : 3];
  const animals: AnimalReading[] = profiles.map(({ id, name, lot }, index) => ({
    id, herdId, name, lot,
    temperature: [40.3, 38.8, 38.4, null][index], rumination: [290, 240, 410, null][index], activity: [24, 12, 48, null][index],
    capturedAt: index === 3 ? null : index === 1 ? '2026-10-08T08:10:00-05:00' : '2026-10-08T10:20:00-05:00',
    syncedAt: index === 3 ? null : '2026-10-08T10:25:00-05:00', connected: index !== 1 && index !== 3,
    position: index === 3 ? null : { x: [182, 475, 290][index], y: [154, 106, 238][index], latitude: (pucara ? -15.49 : -12.15) + index * 0.001, longitude: (pucara ? -70.13 : -75.21) + index * 0.001, accuracy: [8, 12, 9][index], outside: index === 1 },
    samples: index === 3 ? [] : [0, 1, 2].map((sample) => ({ capturedAt: `2026-10-08T${['06:00', '07:00', index === 1 ? '08:10' : '10:20'][sample]}:00-05:00`, temperature: [index === 0 ? 39.4 : 38.2, index === 0 ? 39.8 : 38.6, [40.3, 38.8, 38.4][index]][sample] })),
  }));
  return {
    animals,
    alerts: [
      { id: `${herdId}-temperature`, herdId, animalId: ids[0], priority: 'high', category: 'temperature', title: { en: 'Temperature above demo threshold', es: 'Temperatura sobre el umbral de muestra' }, detail: { en: '40.3 °C recorded. Review the animal; this signal is not a diagnosis.', es: '40.3 °C registrados. Revisa al animal; esta señal no es un diagnóstico.' }, raisedAt: '2026-10-08T10:20:00-05:00', status: 'open', acknowledgedAt: null, resolvedAt: null, responseNote: '', author: '' },
      { id: `${herdId}-location`, herdId, animalId: ids[1], priority: 'high', category: 'location', title: { en: 'Last position outside the illustrative fence', es: 'Última posición fuera del cerco ilustrativo' }, detail: { en: 'Older reading, accuracy 12 m. Current position is unknown.', es: 'Lectura antigua, precisión de 12 m. Se desconoce la posición actual.' }, raisedAt: '2026-10-08T08:10:00-05:00', status: 'open', acknowledgedAt: null, resolvedAt: null, responseNote: '', author: '' },
      { id: `${herdId}-activity`, herdId, animalId: ids[1], priority: 'medium', category: 'activity', title: { en: 'Reduced activity reported', es: 'Actividad reducida reportada' }, detail: { en: 'Sample activity signal. No recent readings are available.', es: 'Señal de actividad de muestra. No hay lecturas recientes disponibles.' }, raisedAt: '2026-10-08T08:10:00-05:00', status: 'acknowledged', acknowledgedAt: '2026-10-08T09:00:00-05:00', resolvedAt: null, responseNote: pucara ? 'Field visit requested · Pucará' : 'Field visit requested · La Esperanza', author: 'Demo rancher' },
    ],
    records: [
      { id: `${herdId}-review`, herdId, animalId: clinicalAnimalId, kind: 'review', occurredAt: '2026-10-08T09:20:00-05:00', note: { en: 'Follow-up recorded. Further assessment remains with the veterinarian.', es: 'Seguimiento registrado. La evaluación posterior corresponde al veterinario.' }, author: 'MVZ D. Carbajal · demo', product: '', dose: '', withdrawalStart: null, withdrawalEnd: null, withdrawalTarget: null },
      { id: `${herdId}-treatment`, herdId, animalId: clinicalAnimalId, kind: 'treatment', occurredAt: '2026-10-06T16:15:00-05:00', note: { en: 'Illustrative intervention and withdrawal dates; not a prescription.', es: 'Intervención y fechas de retiro ilustrativas; no es una receta.' }, author: 'MVZ D. Carbajal · demo', product: 'DEMO-P01', dose: 'Recorded dose · demo', withdrawalStart: '2026-10-06', withdrawalEnd: '2026-10-12', withdrawalTarget: 'both' },
      { id: `${herdId}-heat`, herdId, animalId: fieldAnimalId, kind: 'heat', occurredAt: '2026-10-07T08:30:00-05:00', note: { en: 'Increased activity observed in the field. Heat is unconfirmed.', es: 'Mayor actividad observada en campo. Celo sin confirmar.' }, author: 'Demo rancher', product: '', dose: '', withdrawalStart: null, withdrawalEnd: null, withdrawalTarget: null },
      { id: `${herdId}-service`, herdId, animalId: clinicalAnimalId, kind: 'service', occurredAt: '2026-09-17T08:30:00-05:00', note: { en: 'Service entered by demo veterinarian. Pregnancy assessment pending.', es: 'Servicio registrado por veterinario de muestra. Evaluación de gestación pendiente.' }, author: 'MVZ D. Carbajal · demo', product: '', dose: '', withdrawalStart: null, withdrawalEnd: null, withdrawalTarget: null },
    ],
    lots: [
      { id: `${herdId}-03`, herdId, name: { en: 'Lot 03', es: 'Lote 03' }, animals: pucara ? 1 : 5, pastureTonnes: pucara ? 12 : 18, pastureCapacity: 25, waterPercent: 84, waterTemperature: 18.2, heater: 'off', capturedAt: '2026-10-08T10:15:00-05:00', syncedAt: '2026-10-08T10:25:00-05:00', expectedWeight: 430, estimatedWeight: 438, cycleDay: 74, cycleDays: 90 },
      { id: `${herdId}-01`, herdId, name: { en: 'Lot 01', es: 'Lote 01' }, animals: pucara ? 1 : 2, pastureTonnes: 6, pastureCapacity: 15, waterPercent: 18, waterTemperature: null, heater: 'unknown', capturedAt: '2026-10-08T07:30:00-05:00', syncedAt: '2026-10-08T10:25:00-05:00', expectedWeight: 395, estimatedWeight: 391, cycleDay: 52, cycleDays: 90 },
    ],
  };
}

@Injectable({ providedIn: 'root' })
export class MockOperationsAdapter extends OperationsRepository {
  private readonly state = signal<ReadonlyMap<string, OperationsSnapshot>>(new Map([['esperanza', seed('esperanza')], ['pucara', seed('pucara')]]));
  private readonly listeners = new Set<() => void>();
  private sequence = 0;

  override read(herdId: string, role: HerdRole): OperationsSnapshot {
    if (!this.authorized(herdId, role)) return EMPTY_OPERATIONS;
    return structuredClone(this.state().get(herdId) ?? EMPTY_OPERATIONS);
  }

  override subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  override respond(herdId: string, role: HerdRole, alertId: string, status: Exclude<AlertStatus, 'open'>, note: string, now: string): OperationResult {
    if (!this.authorized(herdId, role)) return { ok: false, error: 'access' };
    const data = this.read(herdId, role);
    const alert = data.alerts.find((item) => item.id === alertId);
    if (!alert || (status === 'acknowledged' ? alert.status !== 'open' : alert.status !== 'acknowledged')) return { ok: false, error: 'transition' };
    if (note.trim().length < 5 || note.trim().length > 500) return { ok: false, error: 'required' };
    const author = role === 'veterinarian' ? 'MVZ D. Carbajal · demo' : 'Demo rancher';
    const alerts = data.alerts.map((item) => item.id === alertId ? { ...item, status, responseNote: note.trim(), author, acknowledgedAt: status === 'acknowledged' ? now : item.acknowledgedAt, resolvedAt: status === 'resolved' ? now : null } : item);
    const records = [...data.records, { id: `${herdId}-response-${++this.sequence}`, herdId, animalId: alert.animalId, kind: 'observation' as const, occurredAt: now, note: { en: note.trim(), es: note.trim() }, author, product: '', dose: '', withdrawalStart: null, withdrawalEnd: null, withdrawalTarget: null }];
    this.publish(herdId, { ...data, alerts, records });
    return { ok: true };
  }

  override record(herdId: string, role: HerdRole, input: CareRecordInput, now: string): OperationResult {
    if (!this.authorized(herdId, role)) return { ok: false, error: 'access' };
    const clinical = CLINICAL_KINDS.includes(input.kind);
    if ((role === 'rancher' && clinical) || (role === 'veterinarian' && !clinical)) return { ok: false, error: 'access' };
    const data = this.read(herdId, role);
    if (!data.animals.some((animal) => animal.id === input.animalId)) return { ok: false, error: 'animal' };
    if (input.note.trim().length < 5 || input.note.trim().length > 500 || !['observation', 'treatment', 'vaccination', 'review', 'heat', 'service', 'calving'].includes(input.kind)) return { ok: false, error: 'required' };
    if (!validDay(input.occurredAt) || input.occurredAt > now.slice(0, 10)) return { ok: false, error: 'date' };
    const administered = input.kind === 'treatment' || input.kind === 'vaccination';
    if (administered && (!input.product.trim() || !input.dose.trim() || input.product.length > 80 || input.dose.length > 80)) return { ok: false, error: 'required' };
    if (administered && (!validDay(input.withdrawalStart) || !validDay(input.withdrawalEnd) || input.withdrawalStart < input.occurredAt || input.withdrawalStart > now.slice(0, 10) || input.withdrawalEnd < input.withdrawalStart || !['milk', 'meat', 'both'].includes(input.withdrawalTarget))) return { ok: false, error: 'withdrawal' };
    if (administered && data.records.some((record) => record.animalId === input.animalId && record.product.toLowerCase() === input.product.trim().toLowerCase() && !!record.withdrawalEnd && !!record.withdrawalStart && record.withdrawalStart <= input.occurredAt && record.withdrawalEnd >= input.occurredAt) && !input.withdrawalReviewed) return { ok: false, error: 'withdrawal-review' };
    const record = { id: `${herdId}-record-${++this.sequence}`, herdId, animalId: input.animalId, kind: input.kind, occurredAt: `${input.occurredAt}T00:00:00-05:00`, note: { en: input.note.trim(), es: input.note.trim() }, author: role === 'veterinarian' ? 'MVZ D. Carbajal · demo' : 'Demo rancher', product: administered ? input.product.trim() : '', dose: administered ? input.dose.trim() : '', withdrawalStart: administered ? input.withdrawalStart : null, withdrawalEnd: administered ? input.withdrawalEnd : null, withdrawalTarget: administered ? input.withdrawalTarget : null };
    this.publish(herdId, { ...data, records: [...data.records, record] });
    return { ok: true };
  }

  private authorized(herdId: string, role: HerdRole): boolean {
    return role === 'rancher' ? herdId === 'esperanza' || herdId === 'pucara' : role === 'veterinarian' && herdId === 'esperanza';
  }

  private publish(herdId: string, data: OperationsSnapshot): void {
    this.state.update((state) => new Map(state).set(herdId, data));
    this.listeners.forEach((listener) => listener());
  }
}
