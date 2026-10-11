import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Trip } from '../models/trip';
import { TripDataService } from '../services/trip-data.service';
import { TripCardComponent } from '../trip-card/trip-card.component';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-trip-listing',
  standalone: true,
  imports: [CommonModule, RouterLink, TripCardComponent],
  templateUrl: './trip-listing.component.html',
  styleUrl: './trip-listing.component.css'
})
export class TripListingComponent implements OnInit {
  trips: Trip[] = [];
  loading = true;
  error = '';

  constructor(private readonly tripData: TripDataService, public readonly auth: AuthenticationService) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips(): void {
    this.loading = true;
    this.error = '';
    this.tripData.getTrips().subscribe({
      next: trips => {
        this.trips = trips;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.trips = [];
        if (error.status !== 404) this.error = 'Trips could not be loaded. Check that the Express server is running.';
      },
    });
  }

  deleteTrip(code: string): void {
    if (!window.confirm(`Delete trip ${code}? This cannot be undone.`)) return;
    this.tripData.deleteTrip(code).subscribe({
      next: () => this.trips = this.trips.filter(trip => trip.code !== code),
      error: () => this.error = `Trip ${code} could not be deleted.`,
    });
  }
}
