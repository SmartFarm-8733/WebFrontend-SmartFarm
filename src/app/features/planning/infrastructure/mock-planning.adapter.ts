import { Injectable, signal } from '@angular/core';
import { PlanningRepository } from '../domain/planning.repository';
import {
  FollowUpReview, HealthCampaign, PlanningAnimal, PlanningContext, PlanningLot, PlanningResult, PlanningSnapshot,
  ScheduleCampaign, WithdrawalPeriod, registerCampaignApplication, reminderIsDue, validateCampaign,
} from '../domain/planning.models';

function animal(herdId: string, tag: string, name: string, active = true): PlanningAnimal {
  // Cattle is not wired into this demo; stable IDs are derived from herd and source tag.
  return { id: `${herdId}-${tag}`, tag, name: { en: name, es: name }, active };
}
function lot(herdId: string, key: string, name: PlanningLot['name'], animals: readonly PlanningAnimal[]): PlanningLot {
  return { id: `${herdId}-lot-${key}`, name, animals };
}

const LUCERO = animal('esperanza', 'ICH118', 'Lucero');
const ESPERANZA_LOTS: readonly PlanningLot[] = [
  lot('esperanza', '01', { en: 'Lot 01', es: 'Lote 01' }, [
    animal('esperanza', 'ICH126', 'Canela'), animal('esperanza', 'ICH201', 'Alba'),
  ]),
  lot('esperanza', '03', { en: 'Lot 03', es: 'Lote 03' }, [
    LUCERO, animal('esperanza', 'ICH104', 'Margarita'), animal('esperanza', 'ICH132', 'Brisa'),
    animal('esperanza', 'ICH134', 'Rocío'), animal('esperanza', 'ICH089', 'María'),
  ]),
  lot('esperanza', 'breeders', { en: 'Breeders', es: 'Reproductores' }, [
    animal('esperanza', 'ICH109', 'Toro'), animal('esperanza', 'ICH014', 'Napoleón'),
  ]),
  lot('esperanza', '05', { en: 'Lot 05', es: 'Lote 05' }, [
    animal('esperanza', 'ICH156', 'Centella', false),
  ]),
];
const PUCARA_LOTS: readonly PlanningLot[] = [
  lot('pucara', 'identified-animals', { en: 'Identified animals', es: 'Animales identificados' }, [
    animal('pucara', 'ICH118', 'Luna'), animal('pucara', 'ICH210', 'Inti'),
  ]),
];

function seedCampaign(herdId: string, id: string, name: HealthCampaign['name'], date: string, selectedLot: PlanningLot, applied: number, type: HealthCampaign['type']): HealthCampaign {
  const animalIds = selectedLot.animals.filter(item => item.active).map(item => item.id);
  const applications = animalIds.slice(0, Math.min(applied, animalIds.length)).map(animalId => ({ animalId, at: `${date}T08:00:00-05:00` }));
  const completed = applications.length === animalIds.length;
  return { id: `${herdId}-${id}`, herdId, name, date, lotId: selectedLot.id, type, animalIds,
    applications,
    status: completed ? 'completed' : applications.length > 0 ? 'in-progress' : 'scheduled',
    closedAt: completed ? `${date}T09:00:00-05:00` : undefined,
    reminder: { leadDays: 3 } };
}

@Injectable({ providedIn: 'root' })
export class MockPlanningAdapter extends PlanningRepository {
  private readonly version = signal(0);
  private readonly lotsByHerd: Readonly<Record<string, readonly PlanningLot[]>> = {
    esperanza: ESPERANZA_LOTS,
    pucara: PUCARA_LOTS,
  };
  private campaigns: HealthCampaign[] = [];
  private reviews: FollowUpReview[] = [];
  private withdrawals: WithdrawalPeriod[] = [];
  private nextId = 1;
  /** Demo professional authorization; the shell must apply the same restriction. */
  readonly authorizedVeterinaryHerds: readonly string[] = ['esperanza'];

  constructor() {
    super();
    for (const [herdId, lots] of Object.entries(this.lotsByHerd)) {
      const campaignLot = lots.find(item => item.id === `${herdId}-lot-03`) ?? lots[0];
      const smallLot = lots.find(item => item.id === `${herdId}-lot-01`) ?? lots[0];
      if (!campaignLot || !smallLot) continue;
      const campaignAnimals = campaignLot.animals.filter(item => item.active);
      const smallAnimals = smallLot.animals.filter(item => item.active);
      this.campaigns.push(
        seedCampaign(herdId, 'parasites', { en: 'Parasite control', es: 'Control de parásitos' }, '2026-10-05', campaignLot, Math.max(0, campaignAnimals.length - 1), 'parasite-control'),
        seedCampaign(herdId, 'vitamins', { en: 'Vitamin application', es: 'Aplicación de vitaminas' }, '2026-10-08', smallLot, Math.min(1, smallAnimals.length), 'general-care'),
        seedCampaign(herdId, 'vaccination', { en: 'Vaccination campaign', es: 'Campaña de vacunación' }, '2026-10-11', campaignLot, 0, 'vaccination'),
        seedCampaign(herdId, 'checkup', { en: 'General care', es: 'Atención general' }, '2026-11-03', smallLot, 0, 'general-care'),
        seedCampaign(herdId, 'september', { en: 'September parasite control', es: 'Control de parásitos de septiembre' }, '2026-09-15', smallLot, smallAnimals.length, 'parasite-control'),
      );
      const firstCampaignAnimal = campaignAnimals[0];
      const secondCampaignAnimal = campaignAnimals[1] ?? firstCampaignAnimal;
      const firstSmallAnimal = smallAnimals[0];
      if (firstCampaignAnimal) this.reviews.push(
        { id: `${herdId}-review-1`, herdId, name: { en: 'Post-treatment review', es: 'Revisión posterior al tratamiento' }, animalId: firstCampaignAnimal.id, lotId: campaignLot.id, date: '2026-10-08', status: 'scheduled' },
      );
      if (secondCampaignAnimal) this.reviews.push(
        { id: `${herdId}-review-2`, herdId, name: { en: 'Recovery review', es: 'Revisión de recuperación' }, animalId: secondCampaignAnimal.id, lotId: campaignLot.id, date: '2026-10-06', status: 'scheduled' },
      );
      if (firstSmallAnimal) this.reviews.push(
        { id: `${herdId}-review-3`, herdId, name: { en: 'Previous review', es: 'Revisión anterior' }, animalId: firstSmallAnimal.id, lotId: smallLot.id, date: '2026-10-02', status: 'completed' },
      );
      const inactiveLot = lots.find(item => item.id === `${herdId}-lot-05`);
      const inactiveAnimal = inactiveLot?.animals.find(item => !item.active);
      if (inactiveLot && inactiveAnimal) this.reviews.push(
        { id: `${herdId}-review-4`, herdId, name: { en: 'Inactive animal review', es: 'Revisión de animal inactivo' }, animalId: inactiveAnimal.id, lotId: inactiveLot.id, date: '2026-10-12', status: 'not-applicable', reason: 'animal-inactive' },
      );
    }
    // Static Operations demo fixture; no live withdrawal synchronization is connected.
    this.withdrawals.push({ herdId: 'esperanza', animalId: LUCERO.id, start: '2026-10-06', end: '2026-10-12',
      product: { en: 'Treatment not specified', es: 'Tratamiento no especificado' }, destination: 'unknown', source: 'demo-clinical-record' });
  }

  override revision(): number { return this.version(); }
  private authorized(context: PlanningContext): boolean {
    return !!this.lotsByHerd[context.herdId] && (context.role === 'rancher' || this.authorizedVeterinaryHerds.includes(context.herdId));
  }
  private canWrite(context: PlanningContext): boolean { return this.authorized(context) && context.role === 'rancher'; }
  override read(context: PlanningContext): PlanningSnapshot {
    if (!this.authorized(context)) return { authorized: false, lots: [], campaigns: [], reviews: [], withdrawals: [] };
    return structuredClone({ authorized: true, lots: this.lotsByHerd[context.herdId] ?? [],
      campaigns: this.campaigns.filter(item => item.herdId === context.herdId),
      reviews: this.reviews.filter(item => item.herdId === context.herdId),
      withdrawals: this.withdrawals.filter(item => item.herdId === context.herdId) });
  }
  override schedule(context: PlanningContext, input: ScheduleCampaign, now: string): PlanningResult {
    if (!this.canWrite(context)) return { ok: false, error: 'forbidden' };
    const lots = this.lotsByHerd[context.herdId] ?? [];
    const error = validateCampaign(input, lots, now.slice(0, 10));
    if (error) return { ok: false, error };
    const selectedLot = lots.find(item => item.id === input.lotId);
    if (!selectedLot) return { ok: false, error: 'lot' };
    const id = `${context.herdId}-new-${this.nextId++}`;
    this.campaigns = [...this.campaigns, { id, herdId: context.herdId, name: { en: input.name.trim(), es: input.name.trim() },
      lotId: input.lotId, date: input.date, type: input.type,
      animalIds: selectedLot.animals.filter(animal => animal.active).slice(0, input.animalCount).map(animal => animal.id),
      applications: [], status: 'scheduled', reminder: { leadDays: input.leadDays } }];
    this.version.update(value => value + 1);
    return { ok: true, id };
  }
  override registerApplication(context: PlanningContext, campaignId: string, animalId: string, now: string): PlanningResult {
    if (!this.canWrite(context)) return { ok: false, error: 'forbidden' };
    const campaign = this.campaigns.find(item => item.id === campaignId && item.herdId === context.herdId);
    if (!campaign) return { ok: false, error: 'missing' };
    const updated = registerCampaignApplication(campaign, animalId, now);
    if (typeof updated === 'string') return { ok: false, error: updated };
    this.campaigns = this.campaigns.map(item => item.id === campaignId ? updated : item);
    this.version.update(value => value + 1);
    return { ok: true, id: campaignId };
  }
  override emitDueReminders(context: PlanningContext, now: string): void {
    if (!this.authorized(context)) return;
    let changed = false;
    this.campaigns = this.campaigns.map(item => {
      if (item.herdId !== context.herdId || !reminderIsDue(item, now.slice(0, 10))) return item;
      changed = true;
      return { ...item, reminder: { ...item.reminder, emittedAt: now } };
    });
    if (changed) this.version.update(value => value + 1);
  }
  override acknowledgeReminder(context: PlanningContext, campaignId: string, now: string): PlanningResult {
    if (!this.canWrite(context)) return { ok: false, error: 'forbidden' };
    const campaign = this.campaigns.find(item => item.id === campaignId && item.herdId === context.herdId);
    if (!campaign?.reminder.emittedAt) return { ok: false, error: 'missing' };
    if (campaign.reminder.acknowledgedAt) return { ok: true, id: campaignId };
    this.campaigns = this.campaigns.map(item => item.id === campaignId ? { ...item, reminder: { ...item.reminder, acknowledgedAt: now } } : item);
    this.version.update(value => value + 1);
    return { ok: true, id: campaignId };
  }
}
