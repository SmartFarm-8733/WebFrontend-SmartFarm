import { type Routes } from '@angular/router';
import { AccountPage } from './presentation/account-page';
import { AdvisoriesPage } from './presentation/advisories-page';
import { LoginPage, RecoveryPage, RegisterPage } from './presentation/auth-pages';

export const IDENTITY_ACCESS_MANAGEMENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'recover', component: RecoveryPage },
  { path: 'account', component: AccountPage },
  { path: 'advisories', component: AdvisoriesPage },
];
