import { PlanningContext, PlanningResult, PlanningSnapshot, ScheduleCampaign } from './planning.models';

/** Synchronous TB1 port. A future remote adapter must make loading/failure explicit. */
export abstract class PlanningRepository {
  abstract revision(): number;
  abstract read(context: PlanningContext): PlanningSnapshot;
  abstract schedule(context: PlanningContext, input: ScheduleCampaign, now: string): PlanningResult;
  abstract registerApplication(context: PlanningContext, campaignId: string, animalId: string, now: string): PlanningResult;
  abstract emitDueReminders(context: PlanningContext, now: string): void;
  abstract acknowledgeReminder(context: PlanningContext, campaignId: string, now: string): PlanningResult;
}
