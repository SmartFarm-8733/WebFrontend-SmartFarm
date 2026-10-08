import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { CattleRepository } from '../domain/cattle.repository';
import { EXIT_REASONS, LIFE_STAGES, LOTS, normalizeTag, validStageForSex } from '../domain/cattle';
import type { Cattle, CattleError, ExitReason, LifeStage, Lot, Registration, Result, Sex } from '../domain/cattle';

export interface CattleFilters {
  readonly search: string;
  readonly lot: Lot | '';
  readonly stage: LifeStage | '';
  readonly status: 'active' | 'inactive' | 'observation' | '';
}

@Injectable()
export class CattleFacade {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  private readonly repository = inject(CattleRepository);
  readonly stages = LIFE_STAGES;
  readonly lots = LOTS;
  readonly exitReasons = EXIT_REASONS;
  readonly writable = computed(() => this.workspace.role() === 'rancher' && this.authorized());
  readonly animals = computed(() => {
    this.repository.revision;
    return this.authorized() ? this.repository.list(this.workspace.herdId()) : [];
  });
  readonly stats = computed(() => {
    const active = this.animals().filter(animal => animal.status === 'active');
    return { active: active.length, connected: active.filter(animal => animal.collar?.connection === 'connected').length,
      observation: active.filter(animal => animal.health === 'observation').length,
      inactive: this.animals().length - active.length };
  });
  readonly result = signal<Result<Cattle> | null>(null);
  readonly error = computed(() => {
    const result = this.result();
    return result && !result.ok ? this.errorLabel(result.error) : '';
  });
  readonly existingId = computed(() => {
    const result = this.result();
    return result && !result.ok ? result.existingId : undefined;
  });

  constructor() {
    effect(() => { this.workspace.herdId(); this.workspace.role(); this.result.set(null); });
  }

  find(id: string): Cattle | undefined { return this.animals().find(animal => animal.id === id); }

  findByTag(tag: string): Cattle | undefined {
    const normalizedTag = normalizeTag(tag);
    return this.animals().find(animal => normalizeTag(animal.tag) === normalizedTag);
  }

  select(filters: CattleFilters): readonly Cattle[] {
    const query = filters.search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return this.animals().filter(animal => {
      const identity = `${animal.tag} ${animal.name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return identity.includes(query) && (!filters.lot || animal.lot === filters.lot) &&
        (!filters.stage || animal.stage === filters.stage) && (!filters.status ||
          (filters.status === 'observation' ? animal.status === 'active' && animal.health === 'observation' : animal.status === filters.status));
    }).sort((left, right) => left.tag.localeCompare(right.tag, 'en', { numeric: true }));
  }

  register(input: Registration): boolean {
    return this.finish(this.writable() ? this.repository.register(this.workspace.herdId(), input, this.workspace.now) :
      { ok: false, error: 'read-only' });
  }

  changeStage(id: string, stage: LifeStage, at: string): boolean {
    return this.finish(this.writable() ? this.repository.changeStage(this.workspace.herdId(), id, stage, at, this.workspace.now) :
      { ok: false, error: 'read-only' });
  }

  deactivate(id: string, reason: ExitReason, at: string): boolean {
    return this.finish(this.writable() ? this.repository.deactivate(this.workspace.herdId(), id, reason, at, this.workspace.now) :
      { ok: false, error: 'read-only' });
  }

  availableStages(sex: Sex): readonly LifeStage[] { return this.stages.filter(stage => validStageForSex(stage, sex)); }

  stageLabel(stage: LifeStage): string {
    const labels: Record<LifeStage, readonly [string, string]> = { calf: ['Calf', 'Ternero/a'], heifer: ['Heifer', 'Vaquillona'],
      dairy: ['Dairy cow', 'Vaca lechera'], dry: ['Dry cow', 'Vaca seca'], breeding: ['Breeding', 'Reproducción'], fattening: ['Fattening', 'Engorde'] };
    return this.locale.text(...labels[stage]);
  }

  lotLabel(lot: Lot): string {
    const labels: Record<Lot, readonly [string, string]> = { 'lot-01': ['Lot 01 · Nursery', 'Lote 01 · Maternidad'],
      'lot-03': ['Lot 03 · Upper pasture', 'Lote 03 · Pastizal alto'], 'lot-05': ['Lot 05 · Fattening', 'Lote 05 · Engorde'],
      breeders: ['Breeders', 'Reproductores'] };
    return this.locale.text(...labels[lot]);
  }

  statusLabel(animal: Cattle): string {
    return animal.status === 'inactive' ? this.locale.text('Inactive', 'Inactivo') : animal.health === 'observation' ?
      this.locale.text('Observation', 'Observación') : this.locale.text('Healthy', 'Sano/a');
  }

  collarLabel(animal: Cattle): string {
    return !animal.collar ? this.locale.text('No collar', 'Sin collar') : animal.collar.connection === 'connected' ?
      this.locale.text('Connected', 'Conectado') : this.locale.text('Disconnected', 'Sin conexión');
  }

  reasonLabel(reason: ExitReason): string {
    const labels: Record<ExitReason, readonly [string, string]> = { sale: ['Sale', 'Venta'], death: ['Death', 'Muerte'],
      theft: ['Theft', 'Robo'], culling: ['Culling', 'Descarte'] };
    return this.locale.text(...labels[reason]);
  }

  date(value: string): string {
    return this.locale.date(value.length === 10 ? `${value}T12:00:00-05:00` : value,
      { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
  }

  private authorized(): boolean {
    return this.workspace.availableHerds().some(herd => herd.id === this.workspace.herdId());
  }

  private finish(result: Result<Cattle>): boolean { this.result.set(result); return result.ok; }

  private errorLabel(error: CattleError): string {
    const labels: Record<CattleError, readonly [string, string]> = {
      'duplicate-tag': ['This tag already belongs to an animal in this herd.', 'Este arete ya pertenece a un animal de este hato.'],
      'invalid-fields': ['Check the tag, name, breed and lot.', 'Revisa el arete, nombre, raza y lote.'],
      'invalid-date': ['Use a valid date, no later than today and no earlier than the current stage.', 'Usa una fecha válida, hasta hoy y desde el inicio de la etapa actual.'],
      'invalid-stage': ['Choose a different stage that matches the animal’s sex.', 'Elige otra etapa compatible con el sexo del animal.'],
      inactive: ['This animal is inactive. Its history remains available.', 'Este animal está inactivo. Su historial sigue disponible.'],
      'not-found': ['This animal is unavailable in the selected herd.', 'Este animal no está disponible en el hato seleccionado.'],
      'read-only': ['Veterinary access is read only for cattle records.', 'El acceso veterinario es de solo lectura para las fichas del hato.'],
    };
    return this.locale.text(...labels[error]);
  }
}
