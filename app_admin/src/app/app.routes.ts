import { Routes } from '@angular/router';
import { TripListingComponent } from './trip-listing/trip-listing.component';
import { AddTripComponent } from './add-trip/add-trip.component';
import { EditTripComponent } from './edit-trip/edit-trip.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './utils/auth.guard';

export const routes: Routes = [
  { path: '', component: TripListingComponent, title: 'Trips | Travlr Admin' },
  { path: 'login', component: LoginComponent, title: 'Login | Travlr Admin' },
  { path: 'add', component: AddTripComponent, canActivate: [authGuard], title: 'Add Trip | Travlr Admin' },
  { path: 'edit/:tripCode', component: EditTripComponent, canActivate: [authGuard], title: 'Edit Trip | Travlr Admin' },
  { path: '**', redirectTo: '' },
];
