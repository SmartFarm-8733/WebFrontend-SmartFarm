import type { Cattle, ExitReason, LifeStage, Registration, Result } from './cattle';

/** Synchronous TB1 port. Each read and write is scoped to one authorized herd. */
export abstract class CattleRepository {
  abstract readonly revision: number;
  abstract list(herdId: string): readonly Cattle[];
  abstract register(herdId: string, input: Registration, now: string): Result<Cattle>;
  abstract changeStage(herdId: string, id: string, stage: LifeStage, at: string, now: string): Result<Cattle>;
  abstract deactivate(herdId: string, id: string, reason: ExitReason, at: string, now: string): Result<Cattle>;
}
