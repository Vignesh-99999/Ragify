import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-google-success',
  templateUrl: './google-success.component.html',
  styleUrls: ['./google-success.component.css']
})
export class GoogleSuccessComponent implements OnInit {

  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {

    // 🔥 SSR GUARD
    if (!this.isBrowser) return;

    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Save token safely
    localStorage.setItem('token', token);
    localStorage.setItem('isLoggedIn', 'true');

    // Fetch user info
    this.auth.getCurrentUser().subscribe({
      next: (user: any) => {

        if (user) {
          localStorage.setItem('userName', user.name || 'User');
          localStorage.setItem('userEmail', user.email || '');
          localStorage.setItem('role', user.role || 'user');
        }

        this.router.navigate(['/home']);
      },

      error: () => {
        // fallback even if API fails
        this.router.navigate(['/home']);
      }
    });
  }
}