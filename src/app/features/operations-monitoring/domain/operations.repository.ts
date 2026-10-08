import { AlertStatus, CareRecordInput, HerdRole, OperationResult, OperationsSnapshot } from './operations.models';

export abstract class OperationsRepository {
  abstract read(herdId: string, role: HerdRole): OperationsSnapshot;
  abstract subscribe(listener: () => void): () => void;
  abstract respond(herdId: string, role: HerdRole, alertId: string, status: Exclude<AlertStatus, 'open'>, note: string, now: string): OperationResult;
  abstract record(herdId: string, role: HerdRole, input: CareRecordInput, now: string): OperationResult;
}
