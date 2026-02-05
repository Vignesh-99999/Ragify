import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Plan {
  id: string;
  name: string;
  duration: string;
  months: number;
  price: number;
}

@Component({
  selector: 'app-payment',
  standalone: true,               // 👈 important
  imports: [CommonModule],        // 👈 FIX #1
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent {

  plans: Plan[] = [
    { id: '1m', name: 'Basic', duration: '1 Month', months: 1, price: 100 },
    { id: '3m', name: 'Standard', duration: '3 Months', months: 3, price: 150 },
    { id: '1y', name: 'Premium', duration: '1 Year', months: 12, price: 200 }
  ];

  selectedPlan: Plan | null = null;

  selectPlan(plan: Plan) {
    this.selectedPlan = plan;
  }

  proceedToPay() {
    if (!this.selectedPlan) {
      alert('Please select a plan');
      return;
    }

    alert(`You selected ${this.selectedPlan.name} for ₹${this.selectedPlan.price}`);
  }
}
