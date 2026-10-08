import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { PlanningRepository } from '../domain/planning.repository';
import {
  DisplayStatus, FollowUpReview, HealthCampaign, PlanningError, ScheduleCampaign,
  campaignDisplayStatus, campaignProgress, daysLate, reviewDisplayStatus, shiftDate, withdrawalOverlaps,
} from '../domain/planning.models';

export type PlanningEntry = {
  readonly kind: 'campaign'; readonly record: HealthCampaign; readonly status: DisplayStatus; readonly delay: number;
} | {
  readonly kind: 'review'; readonly record: FollowUpReview; readonly status: DisplayStatus; readonly delay: number;
};

@Injectable()
export class PlanningFacade {
  private readonly repository = inject(PlanningRepository);
  private readonly workspace = inject(WorkspaceService);
  readonly today = this.workspace.now.slice(0, 10);
  readonly context = computed(() => ({ herdId: this.workspace.herdId(), role: this.workspace.role() }));
  readonly snapshot = computed(() => { this.repository.revision(); return this.repository.read(this.context()); });
  readonly canEdit = computed(() => this.workspace.role() === 'rancher' && this.snapshot().authorized);
  readonly selectedDay = signal(this.today);
  readonly month = signal(`${this.today.slice(0, 7)}-01`);
  readonly view = signal<'calendar' | 'agenda'>('calendar');
  readonly query = signal('');
  readonly status = signal<DisplayStatus | 'all'>('all');
  readonly error = signal<PlanningError | null>(null);
  readonly notice = signal<'scheduled' | 'applied' | 'reminder' | null>(null);
  readonly entries = computed<readonly PlanningEntry[]>(() => [
    ...this.snapshot().campaigns.map(record => ({ kind: 'campaign' as const, record, status: campaignDisplayStatus(record, this.today), delay: record.status === 'completed' ? 0 : daysLate(record.date, this.today) })),
    ...this.snapshot().reviews.map(record => ({ kind: 'review' as const, record, status: reviewDisplayStatus(record, this.today), delay: record.status === 'scheduled' ? daysLate(record.date, this.today) : 0 })),
  ].sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id)));
  readonly filteredEntries = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.entries().filter(entry => (this.status() === 'all' || entry.status === this.status())
      && `${entry.record.name.en} ${entry.record.name.es} ${this.lotSearch(entry.record.lotId)} ${entry.kind === 'review' ? this.animalTag(entry.record.animalId) : ''}`.toLocaleLowerCase().includes(query));
  });
  readonly monthEntries = computed(() => this.filteredEntries().filter(entry => entry.record.date.slice(0, 7) === this.month().slice(0, 7)));
  readonly dayEntries = computed(() => this.filteredEntries().filter(entry => entry.record.date === this.selectedDay()));
  readonly calendarDays = computed(() => {
    const first = new Date(`${this.month()}T00:00:00Z`);
    const offset = (first.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = shiftDate(this.month(), index - offset);
      const entries = this.filteredEntries().filter(entry => entry.record.date === date);
      return { date, number: Number(date.slice(8, 10)), currentMonth: date.slice(0, 7) === this.month().slice(0, 7),
        count: entries.length, overdue: entries.some(entry => entry.status === 'overdue') };
    });
  });
  readonly reminders = computed(() => this.snapshot().campaigns.filter(campaign => campaign.status !== 'completed' && campaign.reminder.emittedAt && !campaign.reminder.acknowledgedAt));
  readonly summary = computed(() => {
    const campaigns = this.snapshot().campaigns.filter(campaign => campaign.date.slice(0, 4) === this.today.slice(0, 4));
    const total = campaigns.reduce((count, campaign) => count + campaign.animalIds.length, 0);
    const applied = campaigns.reduce((count, campaign) => count + campaign.applications.length, 0);
    return { campaigns: campaigns.length, completed: campaigns.filter(campaign => campaign.status === 'completed').length,
      overdue: campaigns.filter(campaign => campaignDisplayStatus(campaign, this.today) === 'overdue').length,
      coverage: total ? Math.round(applied / total * 100) : 0, applied, total };
  });

  constructor() {
    effect(() => {
      this.context();
      this.selectedDay.set(this.today); this.month.set(`${this.today.slice(0, 7)}-01`);
      this.query.set(''); this.status.set('all'); this.error.set(null); this.notice.set(null);
    });
    effect(() => {
      this.repository.revision();
      this.repository.emitDueReminders(this.context(), this.workspace.now);
    });
  }
  private lotSearch(id: string): string { const lot = this.snapshot().lots.find(item => item.id === id); return lot ? `${lot.name.en} ${lot.name.es}` : ''; }
  animalTag(id: string): string { return this.snapshot().lots.flatMap(lot => lot.animals).find(animal => animal.id === id)?.tag ?? '—'; }
  progress(campaign: HealthCampaign): number { return campaignProgress(campaign); }
  overlaps(campaign: HealthCampaign) { return withdrawalOverlaps(campaign.herdId, campaign.animalIds, campaign.date, this.snapshot().withdrawals); }
  selectDay(date: string): void { this.selectedDay.set(date); this.month.set(`${date.slice(0, 7)}-01`); }
  moveMonth(delta: number): void {
    const date = new Date(`${this.month()}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    const month = date.toISOString().slice(0, 10);
    this.month.set(month); this.selectedDay.set(month);
  }
  clearFilters(): void { this.query.set(''); this.status.set('all'); }
  schedule(input: ScheduleCampaign): boolean {
    const result = this.repository.schedule(this.context(), input, this.workspace.now);
    this.error.set(result.ok ? null : result.error); this.notice.set(result.ok ? 'scheduled' : null);
    if (result.ok) this.selectDay(input.date);
    return result.ok;
  }
  apply(campaignId: string, animalId: string): boolean {
    const result = this.repository.registerApplication(this.context(), campaignId, animalId, this.workspace.now);
    this.error.set(result.ok ? null : result.error); this.notice.set(result.ok ? 'applied' : null);
    return result.ok;
  }
  acknowledge(campaignId: string): void {
    const result = this.repository.acknowledgeReminder(this.context(), campaignId, this.workspace.now);
    this.error.set(result.ok ? null : result.error); this.notice.set(result.ok ? 'reminder' : null);
  }
}
