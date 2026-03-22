import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { HistoryComponent } from './features/history-page/history.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'history',
    component: HistoryComponent,
  },
];
