import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {

  status: 'loading' | 'success' | 'error' = 'loading';
  message = 'Activating your Researcher plan...';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {

    // ✅ SSR SAFE CHECK
    if (!isPlatformBrowser(this.platformId)) return;

    // ✅ STEP 1: GET TOKEN FROM URL (VERY IMPORTANT)
    const tokenFromUrl = this.route.snapshot.queryParams['token'];

    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      console.log("✅ Token from URL saved");
    }

    // ✅ STEP 2: GET TOKEN
    const token = localStorage.getItem('token');
    console.log("🔍 Current Token:", token);

    // ❌ NO TOKEN → REDIRECT
    if (!token || token === 'undefined' || token === 'null') {
      this.status = 'error';
      this.message = '⚠️ Session expired. Please login again.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }

    // ✅ STEP 3: CALL UPGRADE API
    this.auth.upgradeToResearcher().subscribe({

      next: (res: any) => {
        console.log("🎉 UPGRADE SUCCESS:", res);

        // ✅ UPDATE TOKEN + USER DATA
        if (res?.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('role', res.role || 'researcher');

          if (res.user) {
            localStorage.setItem('userName', res.user.name || 'User');
            localStorage.setItem('userEmail', res.user.email || '');
          }
        }

        this.status = 'success';
        this.message = '🎉 Your Researcher plan is now active!';

        setTimeout(() => this.router.navigate(['/home']), 2000);
      },

      error: (err) => {
        console.error("❌ UPGRADE ERROR:", err);

        this.status = 'error';

        // 🔥 IMPORTANT: show proper message
        if (err.status === 401) {
          this.message = '⚠️ Login required. Please login again.';
        } else {
          this.message = 'Payment successful, but activation failed. Please login again.';
        }

        setTimeout(() => this.router.navigate(['/login']), 2500);
      }
    });
  }
}