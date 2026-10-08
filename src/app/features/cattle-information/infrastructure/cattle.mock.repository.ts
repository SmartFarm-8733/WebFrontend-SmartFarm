import { Injectable, signal } from '@angular/core';
import { CattleRepository } from '../domain/cattle.repository';
import { changeStage, deactivateCattle, validateRegistration } from '../domain/cattle';
import type { Cattle, Collar, ExitReason, LifeStage, Registration, Result } from '../domain/cattle';

function seed(id: string, herdId: string, tag: string, name: string, stage: LifeStage,
  lot: Cattle['lot'], birthDate: string, connection: Collar['connection'] | null,
  sex: Cattle['sex'] = 'female', health: Cattle['health'] = 'healthy', breed = 'Holstein'): Cattle {
  const registeredAt = birthDate > '2026-01-01' ? birthDate : '2026-01-01';
  return { id, herdId, tag, name, stage, lot, birthDate, sex, health, breed, status: 'active', registeredAt,
    collar: connection ? { id: `CL-${tag.slice(4).padStart(4, '0')}`, connection,
      lastSeen: connection === 'connected' ? '2026-10-08T10:15:00-05:00' : '2026-10-06T06:10:00-05:00' } : null,
    stages: [{ stage, from: registeredAt, to: null }], exit: null,
  };
}

/** Root lifetime keeps demo mutations across list/detail navigation; reload resets them. */
@Injectable({ providedIn: 'root' })
export class CattleMockRepository extends CattleRepository {
  readonly state = signal<readonly Cattle[]>([
    seed('lucero', 'esperanza', 'ICH-118', 'Lucero', 'dairy', 'lot-03', '2022-10-08', 'connected'),
    seed('margarita', 'esperanza', 'ICH-104', 'Margarita', 'dairy', 'lot-03', '2021-06-12', 'connected'),
    seed('canela', 'esperanza', 'ICH-126', 'Canela', 'heifer', 'lot-01', '2025-03-20', null, 'female', 'healthy', 'Brown Swiss'),
    seed('brisa', 'esperanza', 'ICH-132', 'Brisa', 'dry', 'lot-03', '2023-02-18', 'disconnected'),
    seed('toro', 'esperanza', 'ICH-109', 'Toro', 'breeding', 'breeders', '2021-05-04', 'connected', 'male', 'healthy', 'Brown Swiss'),
    seed('rocio', 'esperanza', 'ICH-134', 'Rocío', 'dairy', 'lot-03', '2024-02-08', 'connected'),
    seed('maria', 'esperanza', 'ICH-089', 'María', 'dairy', 'lot-03', '2022-09-15', 'disconnected', 'female', 'observation'),
    seed('napoleon', 'esperanza', 'ICH-014', 'Napoleón', 'breeding', 'breeders', '2021-09-15', 'connected', 'male', 'observation'),
    seed('alba', 'esperanza', 'ICH-201', 'Alba', 'calf', 'lot-01', '2026-08-03', null),
    { ...seed('centella', 'esperanza', 'ICH-156', 'Centella', 'fattening', 'lot-05', '2025-01-11', null),
      status: 'inactive', stages: [{ stage: 'fattening', from: '2026-01-01', to: '2026-10-02' }],
      exit: { reason: 'sale', at: '2026-10-02', releasedCollarId: 'CL-0156' } },
    seed('pucara-luna', 'pucara', 'ICH-118', 'Luna', 'dairy', 'lot-03', '2023-04-10', 'connected', 'female', 'healthy', 'Brown Swiss'),
    seed('pucara-inti', 'pucara', 'ICH-210', 'Inti', 'calf', 'lot-01', '2026-07-21', null, 'male', 'healthy', 'Brown Swiss'),
  ]);
  private readonly changes = signal(0);
  override get revision(): number { return this.changes(); }

  override list(herdId: string): readonly Cattle[] {
    return structuredClone(this.state().filter(animal => animal.herdId === herdId));
  }

  override register(herdId: string, input: Registration, now: string): Result<Cattle> {
    if (!['esperanza', 'pucara'].includes(herdId)) return { ok: false, error: 'not-found' };
    const result = validateRegistration(input, this.list(herdId), now);
    if (!result.ok) return result;
    const animal: Cattle = { ...result.value, id: `animal-${crypto.randomUUID()}`, herdId,
      registeredAt: now.slice(0, 10), status: 'active', health: 'healthy', collar: null, exit: null,
      stages: [{ stage: result.value.stage, from: now.slice(0, 10), to: null }],
    };
    this.state.update(animals => [...animals, animal]);
    this.changes.update(value => value + 1);
    return { ok: true, value: structuredClone(animal) };
  }

  override changeStage(herdId: string, id: string, stage: LifeStage, at: string, now: string): Result<Cattle> {
    const animal = this.list(herdId).find(item => item.id === id);
    return animal ? this.save(changeStage(animal, stage, at, now)) : { ok: false, error: 'not-found' };
  }

  override deactivate(herdId: string, id: string, reason: ExitReason, at: string, now: string): Result<Cattle> {
    const animal = this.list(herdId).find(item => item.id === id);
    return animal ? this.save(deactivateCattle(animal, reason, at, now)) : { ok: false, error: 'not-found' };
  }

  private save(result: Result<Cattle>): Result<Cattle> {
    if (result.ok) {
      this.state.update(animals => animals.map(animal => animal.id === result.value.id ? result.value : animal));
      this.changes.update(value => value + 1);
    }
    return result.ok ? { ok: true, value: structuredClone(result.value) } : result;
  }
}
