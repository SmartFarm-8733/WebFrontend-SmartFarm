import { Injectable, signal } from '@angular/core';
import { PlanningRepository } from '../domain/planning.repository';
import {
  FollowUpReview, HealthCampaign, PlanningContext, PlanningLot, PlanningResult, PlanningSnapshot,
  ScheduleCampaign, WithdrawalPeriod, registerCampaignApplication, reminderIsDue, validateCampaign,
} from '../domain/planning.models';

function lot(herd: string, index: number, count: number): PlanningLot {
  return { id: `${herd}-lot-${index}`, name: { en: `Lot 0${index}`, es: `Lote 0${index}` },
    animals: Array.from({ length: count }, (_, item) => ({ id: `${herd}-${index}-${item + 1}`, tag: `${index}${String(item + 1).padStart(3, '0')}`, active: true })) };
}
function seedCampaign(herdId: string, id: string, name: HealthCampaign['name'], date: string, selectedLot: PlanningLot, applied: number, type: HealthCampaign['type']): HealthCampaign {
  const animalIds = selectedLot.animals.map(animal => animal.id);
  return { id: `${herdId}-${id}`, herdId, name, date, lotId: selectedLot.id, type, animalIds,
    applications: animalIds.slice(0, applied).map(animalId => ({ animalId, at: `${date}T08:00:00-05:00` })),
    status: applied === animalIds.length ? 'completed' : applied > 0 ? 'in-progress' : 'scheduled',
    closedAt: applied === animalIds.length ? `${date}T09:00:00-05:00` : undefined,
    reminder: { leadDays: 3 } };
}

@Injectable({ providedIn: 'root' })
export class MockPlanningAdapter extends PlanningRepository {
  private readonly version = signal(0);
  private readonly lotsByHerd: Readonly<Record<string, readonly PlanningLot[]>> = {
    esperanza: [lot('esperanza', 1, 8), lot('esperanza', 3, 12)],
    pucara: [lot('pucara', 1, 6), lot('pucara', 2, 10)],
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
      const first = lots[0];
      const second = lots[1];
      this.campaigns.push(
        seedCampaign(herdId, 'parasites', { en: 'Parasite control', es: 'Control de parásitos' }, '2026-10-05', second, 9 > second.animals.length ? 4 : 9, 'parasite-control'),
        seedCampaign(herdId, 'vitamins', { en: 'Vitamin application', es: 'Aplicación de vitaminas' }, '2026-10-08', first, 2, 'general-care'),
        seedCampaign(herdId, 'vaccination', { en: 'Vaccination campaign', es: 'Campaña de vacunación' }, '2026-10-11', second, 0, 'vaccination'),
        seedCampaign(herdId, 'checkup', { en: 'General care', es: 'Atención general' }, '2026-11-03', first, 0, 'general-care'),
        seedCampaign(herdId, 'september', { en: 'September parasite control', es: 'Control de parásitos de septiembre' }, '2026-09-15', first, first.animals.length, 'parasite-control'),
      );
      this.reviews.push(
        { id: `${herdId}-review-1`, herdId, name: { en: 'Post-treatment review', es: 'Revisión posterior al tratamiento' }, animalId: first.animals[0].id, lotId: first.id, date: '2026-10-08', status: 'scheduled' },
        { id: `${herdId}-review-2`, herdId, name: { en: 'Recovery review', es: 'Revisión de recuperación' }, animalId: first.animals[1].id, lotId: first.id, date: '2026-10-06', status: 'scheduled' },
        { id: `${herdId}-review-3`, herdId, name: { en: 'Previous review', es: 'Revisión anterior' }, animalId: first.animals[2].id, lotId: first.id, date: '2026-10-02', status: 'completed' },
        { id: `${herdId}-review-4`, herdId, name: { en: 'Inactive animal review', es: 'Revisión de animal inactivo' }, animalId: `${herdId}-inactive`, lotId: first.id, date: '2026-10-12', status: 'not-applicable', reason: 'animal-inactive' },
      );
      this.withdrawals.push({ herdId, animalId: first.animals[0].id, start: '2026-10-06', end: '2026-10-10', product: { en: 'Demo treatment A', es: 'Tratamiento A de demostración' }, destination: 'milk', source: 'demo-clinical-record' });
    }
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
