export interface LocalizedName { readonly en: string; readonly es: string; }
export type PlanningRole = 'rancher' | 'veterinarian';
export interface PlanningContext { readonly herdId: string; readonly role: PlanningRole; }
export type CampaignStatus = 'scheduled' | 'in-progress' | 'completed';
export type ReviewStatus = 'scheduled' | 'completed' | 'not-applicable';
export type DisplayStatus = CampaignStatus | 'overdue' | 'not-applicable';
export type CampaignType = 'vaccination' | 'parasite-control' | 'general-care';
export interface PlanningAnimal { readonly id: string; readonly tag: string; readonly active: boolean; readonly name?: LocalizedName; }
export interface PlanningLot { readonly id: string; readonly name: LocalizedName; readonly animals: readonly PlanningAnimal[]; }
export interface CampaignApplication { readonly animalId: string; readonly at: string; }
export interface CampaignReminder { readonly leadDays: number; readonly emittedAt?: string; readonly acknowledgedAt?: string; }
export interface HealthCampaign {
  readonly id: string;
  readonly herdId: string;
  readonly name: LocalizedName;
  readonly type: CampaignType;
  readonly lotId: string;
  readonly date: string;
  readonly animalIds: readonly string[];
  readonly applications: readonly CampaignApplication[];
  readonly status: CampaignStatus;
  readonly closedAt?: string;
  readonly reminder: CampaignReminder;
}
export interface FollowUpReview {
  readonly id: string;
  readonly herdId: string;
  readonly name: LocalizedName;
  readonly animalId: string;
  readonly lotId: string;
  readonly date: string;
  readonly status: ReviewStatus;
  readonly reason?: 'animal-inactive';
}
export interface WithdrawalPeriod {
  readonly herdId: string;
  readonly animalId: string;
  readonly start: string;
  readonly end: string;
  readonly product: LocalizedName;
  readonly destination: 'milk' | 'meat' | 'unknown';
  readonly source: 'demo-clinical-record' | 'unknown';
}
export interface PlanningSnapshot {
  readonly authorized: boolean;
  readonly lots: readonly PlanningLot[];
  readonly campaigns: readonly HealthCampaign[];
  readonly reviews: readonly FollowUpReview[];
  readonly withdrawals: readonly WithdrawalPeriod[];
}
export interface ScheduleCampaign {
  readonly name: string;
  readonly lotId: string;
  readonly date: string;
  readonly type: CampaignType;
  readonly animalCount: number;
  readonly leadDays: number;
}
export type PlanningError = 'forbidden' | 'name' | 'lot' | 'date' | 'animals' | 'reminder' | 'missing' | 'duplicate' | 'future' | 'completed';
export type PlanningResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly error: PlanningError };

/** Date-only values use UTC arithmetic; display uses the supplied locale separately. */
export function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed : Number.NaN;
}
export function shiftDate(value: string, days: number): string {
  return new Date(dateValue(value) + days * 86_400_000).toISOString().slice(0, 10);
}
export function daysLate(date: string, today: string): number {
  return Math.max(0, Math.floor((dateValue(today) - dateValue(date)) / 86_400_000));
}
export function campaignProgress(campaign: HealthCampaign): number {
  return campaign.animalIds.length === 0 ? 0 : Math.round(campaign.applications.length / campaign.animalIds.length * 100);
}
export function campaignDisplayStatus(campaign: HealthCampaign, today: string): DisplayStatus {
  return campaign.status !== 'completed' && daysLate(campaign.date, today) > 0 ? 'overdue' : campaign.status;
}
export function reviewDisplayStatus(review: FollowUpReview, today: string): DisplayStatus {
  return review.status === 'scheduled' && daysLate(review.date, today) > 0 ? 'overdue' : review.status;
}
export function withdrawalOverlaps(herdId: string, animalIds: readonly string[], date: string, periods: readonly WithdrawalPeriod[]): readonly WithdrawalPeriod[] {
  const at = dateValue(date);
  return periods.filter(period => period.source === 'demo-clinical-record' && period.herdId === herdId && animalIds.includes(period.animalId)
    && at >= dateValue(period.start) && at <= dateValue(period.end));
}
export function validateCampaign(input: ScheduleCampaign, lots: readonly PlanningLot[], today: string): PlanningError | undefined {
  if (!input.name.trim() || input.name.trim().length > 80) return 'name';
  const lot = lots.find(item => item.id === input.lotId);
  if (!lot) return 'lot';
  if (!Number.isFinite(dateValue(input.date)) || input.date < today) return 'date';
  if (!Number.isInteger(input.animalCount) || input.animalCount < 1 || input.animalCount > lot.animals.filter(animal => animal.active).length) return 'animals';
  if (!Number.isInteger(input.leadDays) || input.leadDays < 0 || input.leadDays > 30) return 'reminder';
  return undefined;
}
export function registerCampaignApplication(campaign: HealthCampaign, animalId: string, at: string): HealthCampaign | PlanningError {
  if (campaign.status === 'completed') return 'completed';
  if (campaign.date > at.slice(0, 10)) return 'future';
  if (!campaign.animalIds.includes(animalId)) return 'animals';
  if (campaign.applications.some(application => application.animalId === animalId)) return 'duplicate';
  const applications = [...campaign.applications, { animalId, at }];
  const completed = applications.length === campaign.animalIds.length;
  return { ...campaign, applications, status: completed ? 'completed' : 'in-progress', closedAt: completed ? at : undefined };
}
export function reminderIsDue(campaign: HealthCampaign, today: string): boolean {
  return campaign.status !== 'completed' && !campaign.reminder.emittedAt && today >= shiftDate(campaign.date, -campaign.reminder.leadDays);
}
