import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TripDataService } from '../services/trip-data.service';
import { createTripForm } from '../models/trip-form';
import { TripFieldsComponent } from '../trip-fields/trip-fields.component';

@Component({
  selector: 'app-edit-trip',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TripFieldsComponent],
  templateUrl: './edit-trip.component.html',
  styleUrl: './edit-trip.component.css'
})
export class EditTripComponent implements OnInit {
  form;
  loading = true;
  saving = false;
  error = '';
  private readonly originalCode: string;

  constructor(
    builder: FormBuilder,
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly tripData: TripDataService,
  ) {
    this.form = createTripForm(builder);
    this.originalCode = route.snapshot.paramMap.get('tripCode') || '';
  }

  ngOnInit(): void {
    this.tripData.getTrip(this.originalCode).subscribe({
      next: trip => {
        this.form.patchValue({ ...trip, start: trip.start.slice(0, 10) });
        this.form.controls.code.disable();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = `Trip ${this.originalCode} could not be loaded.`;
      },
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.error = '';
    const trip = this.form.getRawValue();
    trip.code = trip.code.toUpperCase();
    this.tripData.updateTrip(this.originalCode, trip).subscribe({
      next: () => this.router.navigate(['/']),
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.error = error.error?.message || 'The trip could not be updated.';
      },
    });
  }
}
