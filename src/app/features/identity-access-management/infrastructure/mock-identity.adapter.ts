import { Injectable, signal } from '@angular/core';
import {
  advisoryStatus, validProfile, IdentityRepository,
  type AdvisoryAction, type AdvisoryResult, type DemoProfile, type DemoRole,
  type HerdAdvisory, type ProfileSaveResult,
} from '../domain/identity.repository';

@Injectable({ providedIn: 'root' })
export class MockIdentityAdapter extends IdentityRepository {
  readonly revision = signal(0);
  private readonly profiles = new Map<string, DemoProfile>();
  private readonly records: HerdAdvisory[] = [
    { id: 'adv-es-dana', herdId: 'esperanza', veterinarianId: 'vet-dana',
      name: 'Daniela Carbajal', license: 'CMVP-10428', specialty: 'herd-health',
      status: 'active', requestedAt: '2026-09-15T09:00:00-05:00',
      expiresAt: '2026-10-31T23:59:59-05:00', changedAt: '2026-09-16T10:00:00-05:00' },
    { id: 'adv-es-luis', herdId: 'esperanza', veterinarianId: 'vet-luis',
      name: 'Luis Huamán', license: 'CMVP-11852', specialty: 'reproduction',
      status: 'pending', requestedAt: '2026-10-07T14:00:00-05:00',
      expiresAt: '2026-12-31T23:59:59-05:00', changedAt: null },
    { id: 'adv-pu-dana', herdId: 'pucara', veterinarianId: 'vet-dana',
      name: 'Daniela Carbajal', license: 'CMVP-10428', specialty: 'herd-health',
      status: 'active', requestedAt: '2026-08-01T09:00:00-05:00',
      expiresAt: '2026-09-30T23:59:59-05:00', changedAt: '2026-08-02T10:00:00-05:00' },
    { id: 'adv-pu-luis', herdId: 'pucara', veterinarianId: 'vet-luis',
      name: 'Luis Huamán', license: 'CMVP-11852', specialty: 'reproduction',
      status: 'pending', requestedAt: '2026-10-06T11:00:00-05:00',
      expiresAt: '2026-12-31T23:59:59-05:00', changedAt: null },
  ];

  override profile(herdId: string, role: DemoRole): DemoProfile {
    const stored = this.profiles.get(this.profileKey(herdId, role));
    return stored ? { ...stored } : {
      herdId, role, name: role === 'rancher' ? 'Próspero Contreras' : 'Daniela Carbajal',
      email: role === 'rancher' ? 'prospero@example.com' : 'daniela@example.com',
      region: herdId === 'pucara' ? 'Puno' : 'Junín',
      specialty: role === 'veterinarian' ? 'Herd health' : '',
      license: role === 'veterinarian' ? 'CMVP-10428' : '',
      experience: role === 'veterinarian' ? 8 : 0,
    };
  }

  override saveProfile(profile: DemoProfile): ProfileSaveResult {
    if (!['esperanza', 'pucara'].includes(profile.herdId) || !validProfile(profile)) return 'invalid';
    if (profile.role === 'veterinarian' && profile.license === 'CMVP-11852') return 'duplicate-license';
    this.profiles.set(this.profileKey(profile.herdId, profile.role), {
      ...profile, name: profile.name.trim(), email: profile.email.trim(),
      specialty: profile.specialty.trim(),
    });
    this.revision.update(value => value + 1);
    return 'saved';
  }

  override advisories(herdId: string, role: DemoRole, now: string): readonly HerdAdvisory[] {
    return this.records.filter(record => record.herdId === herdId
      && (role === 'rancher' || record.veterinarianId === 'vet-dana'))
      .map(record => ({ ...record, status: advisoryStatus(record, now) }));
  }

  override authorizedHerdIds(role: DemoRole, now: string): readonly string[] {
    return role === 'rancher' ? ['esperanza', 'pucara'] : this.records
      .filter(record => record.veterinarianId === 'vet-dana'
        && advisoryStatus(record, now) === 'active')
      .map(record => record.herdId);
  }

  override changeAdvisory(
    herdId: string, id: string, action: AdvisoryAction, role: DemoRole, now: string,
  ): AdvisoryResult {
    if (role !== 'rancher') return 'forbidden';
    const index = this.records.findIndex(record => record.id === id && record.herdId === herdId);
    if (index < 0) return 'missing';
    const record = this.records[index];
    if (!record) return 'missing';
    const status = advisoryStatus(record, now);
    if (((action === 'accept' || action === 'reject') && status !== 'pending')
      || (action === 'revoke' && status !== 'active')) return 'invalid-transition';
    this.records[index] = {
      ...record, status: action === 'accept' ? 'active' : action === 'reject' ? 'rejected' : 'revoked',
      changedAt: now,
    };
    this.revision.update(value => value + 1);
    return 'updated';
  }

  private profileKey(herdId: string, role: DemoRole): string {
    return herdId + ':' + role;
  }
}

/** Local composition binding; all pages reuse the root-owned adapter. */
export const IDENTITY_REPOSITORY_PROVIDER = {
  provide: IdentityRepository, useExisting: MockIdentityAdapter,
};
