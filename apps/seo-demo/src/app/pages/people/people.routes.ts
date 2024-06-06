import { Routes } from '@angular/router';
import { PeopleComponent } from './people.component';

export const PEOPLE_ROUTES: Routes = [
  {
    path: '',
    component: PeopleComponent
  },
  {
    path: ':id',
    component: PeopleComponent,
    loadChildren: () => import('./show/show.routes').then(m => m.SHOW_ROUTES)
  },
];