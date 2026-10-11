import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Reservation } from '../models/reservation';
import { ManagementService } from '../services/management.service';

@Component({
  selector: 'app-reservation-management', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './reservation-management.component.html',
})
export class ReservationManagementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  reservations: Reservation[] = [];
  loading = false;
  busy = false;
  error = '';
  message = '';
  constructor(private readonly management: ManagementService) {}
  ngOnInit(): void {
    this.loading = true;
    this.management.getReservations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: reservations => { this.reservations = reservations; this.loading = false; },
      error: (error: HttpErrorResponse) => { this.loading = false; this.error = error.error?.message || 'Reservations could not be loaded.'; },
    });
  }
  save(reservation: Reservation): void {
    if (this.busy) return;
    this.busy = true; this.error = ''; this.message = '';
    this.management.updateReservation(reservation._id, reservation.status).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => { reservation.status = updated.status; this.busy = false; this.message = 'Reservation status saved.'; },
      error: (error: HttpErrorResponse) => { this.busy = false; this.error = error.error?.message || 'The reservation could not be saved.'; },
    });
  }
}
