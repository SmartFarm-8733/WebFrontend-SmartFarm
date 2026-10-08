import { expect, test } from '@playwright/test';
import {
  DEMO_ANIMALS,
  DEMO_DEVICE_CAP,
  DEMO_DEVICE_FIXTURES,
  isDeviceAccessAuthorized,
} from '../../src/app/features/iot-assets/infrastructure/mock-device.adapter';

test('device fixture identifiers are globally unique', () => {
  const identifiers = DEMO_DEVICE_FIXTURES.map((device) => device.id);

  expect(new Set(identifiers).size).toBe(identifiers.length);
});

test('assignments reference known active animals in the same herd', () => {
  const animalsById = new Map(DEMO_ANIMALS.map((animal) => [animal.id, animal]));

  for (const device of DEMO_DEVICE_FIXTURES) {
    if (device.type !== 'collar' || device.assignment === null) continue;

    const animal = animalsById.get(device.assignment.animal.id);
    expect(animal, `${device.id} should reference a known active animal`).toBeDefined();
    expect(device.herdId).toBe(animal?.herdId);
    expect(device.assignment.animal).toEqual(animal);
  }
});

test('collar serials are unique and assignments retain canonical animal labels', () => {
  const assignmentByDeviceId = new Map(
    DEMO_DEVICE_FIXTURES
      .filter((device) => device.type === 'collar' && device.assignment !== null)
      .map((device) => [device.id, device.assignment?.animal]),
  );

  expect(assignmentByDeviceId.get('CL-0118')).toMatchObject({ id: 'lucero', earTag: 'ICH-118', name: 'Lucero' });
  expect(assignmentByDeviceId.get('CL-0301')).toMatchObject({ id: 'pucara-luna', earTag: 'ICH-118', name: 'Luna' });
  expect(assignmentByDeviceId.get('CL-0210')).toMatchObject({ id: 'pucara-inti', earTag: 'ICH-210', name: 'Inti' });
});

test('assigned collar fixtures stay within the demo plan cap per herd', () => {
  for (const herdId of ['esperanza', 'pucara']) {
    const assigned = DEMO_DEVICE_FIXTURES.filter((device) =>
      device.herdId === herdId && device.type === 'collar' && device.assignment !== null,
    );

    expect(assigned.length).toBeLessThanOrEqual(DEMO_DEVICE_CAP);
  }
});

test('veterinarian access is limited to Esperanza while ranchers can access both demo herds', () => {
  expect(isDeviceAccessAuthorized({ role: 'veterinarian', herdId: 'esperanza' })).toBe(true);
  expect(isDeviceAccessAuthorized({ role: 'veterinarian', herdId: 'pucara' })).toBe(false);
  expect(isDeviceAccessAuthorized({ role: 'rancher', herdId: 'esperanza' })).toBe(true);
  expect(isDeviceAccessAuthorized({ role: 'rancher', herdId: 'pucara' })).toBe(true);
  expect(isDeviceAccessAuthorized({ role: 'rancher', herdId: 'unknown' })).toBe(false);
});
