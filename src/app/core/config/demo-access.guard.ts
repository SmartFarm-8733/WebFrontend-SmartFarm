import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DemoSessionService } from './demo-session.service';

/** Keeps demonstration navigation coherent; this is not an authorization boundary. */
export const demoAccessGuard: CanActivateFn = () => {
  const session = inject(DemoSessionService);
  return session.active() || inject(Router).createUrlTree(['/login']);
};
