import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../services/payment.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent {

  userEmail: string = '';

  plans = [
    { name: 'Monthly', price: 100, duration: '1 Month', months: 1 },
    { name: 'Quarterly', price: 300, duration: '3 Months', months: 3 },
    { name: 'Yearly', price: 500, duration: '12 Months', months: 12 }
  ];

  selectedPlan: any = null;

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService, // ✅ Inject AuthService
  ) {}

  ngOnInit() {
    // ================= Fetch user email automatically =================
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user && user.email) {
          this.userEmail = user.email; // auto-fill email
        }
      },
      error: (err) => {
        console.error('Failed to fetch user email', err);
      }
    });

    // ================= Check query params for selected plan =================
    this.route.queryParams.subscribe(params => {
      if (params['name']) {
        this.selectedPlan = {
          name: params['name'],
          price: +params['price'],
          duration: params['duration'],
          months: +params['months']
        };
      }
    });
  }

  selectPlan(plan: any) {
    this.selectedPlan = plan;
  }

  proceedToPay() {
    if (!this.selectedPlan) {
      alert('Please select a plan');
      return;
    }

    if (!this.userEmail || !this.userEmail.includes('@')) {
      alert('Email not found. Please check your profile.');
      return;
    }

    this.startPayment();
  }

  // ================= UPDATED PAYMENT FLOW =================
  startPayment() {
    this.paymentService.createCheckoutSession({
      amount: this.selectedPlan.price,
      plan: this.selectedPlan.name,
      email: this.userEmail
    })
    .subscribe({
      next: (session: any) => {
        // ✅ New Stripe method: direct redirect
        if (session.url) {
          window.location.href = session.url;
        } else {
          alert('Payment session failed');
        }
      },
      error: (err) => {
        console.error(err);
        alert('Payment failed');
      }
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}