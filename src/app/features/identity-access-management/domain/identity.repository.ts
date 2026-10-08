export type DemoRole = 'rancher' | 'veterinarian';
export type AdvisoryStatus = 'pending' | 'active' | 'revoked' | 'rejected' | 'expired';
export type AdvisoryAction = 'accept' | 'reject' | 'revoke';

export interface DemoProfile {
  readonly herdId: string;
  readonly role: DemoRole;
  readonly name: string;
  readonly email: string;
  readonly region: string;
  readonly specialty: string;
  readonly license: string;
  readonly experience: number;
}

export interface HerdAdvisory {
  readonly id: string;
  readonly herdId: string;
  readonly veterinarianId: string;
  readonly name: string;
  readonly license: string;
  readonly specialty: 'herd-health' | 'reproduction';
  readonly status: AdvisoryStatus;
  readonly requestedAt: string;
  readonly expiresAt: string | null;
  readonly changedAt: string | null;
}

export type ProfileSaveResult = 'saved' | 'invalid' | 'duplicate-license';
export type AdvisoryResult = 'updated' | 'forbidden' | 'invalid-transition' | 'missing';

export function validProfile(profile: DemoProfile): boolean {
  const basic = profile.name.trim().length >= 2 && profile.name.trim().length <= 80
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
    && profile.email.length <= 120 && ['Junín', 'Puno', 'Cusco', 'other'].includes(profile.region);
  return basic && (profile.role === 'rancher' || (
    profile.specialty.trim().length >= 2 && profile.specialty.trim().length <= 80
    && /^CMVP-\d{4,6}$/.test(profile.license)
    && Number.isInteger(profile.experience) && profile.experience >= 0 && profile.experience <= 60
  ));
}

export function advisoryStatus(advisory: HerdAdvisory, now: string): AdvisoryStatus {
  return advisory.status === 'active' && advisory.expiresAt !== null
    && Date.parse(advisory.expiresAt) <= Date.parse(now) ? 'expired' : advisory.status;
}

/** TB1 port. Implementations never accept or persist credentials. */
export abstract class IdentityRepository {
  abstract profile(herdId: string, role: DemoRole): DemoProfile;
  abstract saveProfile(profile: DemoProfile): ProfileSaveResult;
  abstract advisories(herdId: string, role: DemoRole, now: string): readonly HerdAdvisory[];
  abstract authorizedHerdIds(role: DemoRole, now: string): readonly string[];
  abstract changeAdvisory(
    herdId: string, id: string, action: AdvisoryAction, role: DemoRole, now: string,
  ): AdvisoryResult;
}

