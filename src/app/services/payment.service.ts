import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private apiUrl = 'http://localhost:5000/api/payment';

  constructor(private http: HttpClient) {}

  createCheckoutSession(data: any) {
    return this.http.post(
      `${this.apiUrl}/create-checkout-session`,
      data
    );
  }
}