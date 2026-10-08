import { Provider } from '@angular/core';
import { OperationsRepository } from '../domain/operations.repository';
import { MockOperationsAdapter } from '../infrastructure/mock-operations.adapter';
import { OperationsFacade } from './operations.facade';

export const OPERATIONS_PROVIDERS: Provider[] = [
  { provide: OperationsRepository, useExisting: MockOperationsAdapter },
  OperationsFacade,
];
