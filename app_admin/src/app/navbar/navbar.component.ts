import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-navbar', standalone: true, imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly publicUrl = `http://${window.location.hostname}:3000/travel`;
  constructor(public readonly auth: AuthenticationService, private readonly router: Router) {}
  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
