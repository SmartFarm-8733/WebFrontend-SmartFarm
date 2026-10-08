import { computed, inject, Injectable, signal } from '@angular/core';
import { WorkspaceService } from '../../../core/config/workspace.service';
import {
  IdentityRepository, type AdvisoryAction, type AdvisoryResult,
  type DemoProfile, type ProfileSaveResult,
} from '../domain/identity.repository';

@Injectable()
export class IdentityFacade {
  private readonly repository = inject(IdentityRepository);
  private readonly workspace = inject(WorkspaceService);
  private readonly refresh = signal(0);

  readonly contextKey = computed(() => this.workspace.herdId() + ':' + this.workspace.role());
  readonly profile = computed(() => {
    this.refresh();
    return this.repository.profile(this.workspace.herdId(), this.workspace.role());
  });
  readonly advisories = computed(() => {
    this.refresh();
    return this.repository.advisories(
      this.workspace.herdId(), this.workspace.role(), this.workspace.now,
    );
  });
  readonly canManage = computed(() => this.workspace.role() === 'rancher');
  readonly hasHerdAccess = computed(() => {
    this.refresh();
    return this.repository.authorizedHerdIds(this.workspace.role(), this.workspace.now)
      .includes(this.workspace.herdId());
  });
  readonly activeCount = computed(() => this.advisories().filter(row => row.status === 'active').length);
  readonly pendingCount = computed(() => this.advisories().filter(row => row.status === 'pending').length);

  saveProfile(values: Omit<DemoProfile, 'herdId' | 'role'>): ProfileSaveResult {
    const result = this.repository.saveProfile({
      ...values, herdId: this.workspace.herdId(), role: this.workspace.role(),
    });
    if (result === 'saved') this.refresh.update(value => value + 1);
    return result;
  }

  changeAdvisory(id: string, action: AdvisoryAction): AdvisoryResult {
    const result = this.repository.changeAdvisory(
      this.workspace.herdId(), id, action, this.workspace.role(), this.workspace.now,
    );
    if (result === 'updated') this.refresh.update(value => value + 1);
    return result;
  }
}
