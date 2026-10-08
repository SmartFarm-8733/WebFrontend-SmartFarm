import { DeviceAccess, DeviceInventory, DeviceMutation, ReleaseReason } from './device.model';

// The future backend owns authorization, animal lookup, entitlements and assignment history.
// This Angular-free contract keeps those decisions out of presentation.
export abstract class DeviceRepository {
  abstract inventory(access: DeviceAccess): DeviceInventory;
  abstract assign(access: DeviceAccess, deviceId: string, animalId: string, at: string): DeviceMutation;
  abstract release(access: DeviceAccess, deviceId: string, reason: ReleaseReason, at: string): DeviceMutation;
}
