import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // ✅ Base URLs
  private BASE_API = 'http://localhost:5000/api';
  private AUTH_API = `${this.BASE_API}/auth`;
  private ADMIN_API = `${this.BASE_API}/admin`;
  private FORGOT_API = `${this.BASE_API}/forgot-password`;

  constructor(private http: HttpClient) {}

  // =================== USER AUTH ===================

  signup(data: { name: string; email: string; mobile: string; password: string; confirmPassword: string }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/signup`, data);
  }

  loginWithPassword(data: { mobile: string; password: string }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/login`, data);
  }

  loginWithGoogle(): Observable<any> {
    return this.http.get(`${this.AUTH_API}/google`, { responseType: 'text' }); // redirect handled in backend
  }

  getCurrentUser(): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      return of(null);
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get(`${this.AUTH_API}/me`, { headers });
  }

  // =================== ADMIN AUTH ===================

  loginAdmin(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.ADMIN_API}/login`, data);
  }

  // =================== EMAIL OTP ===================

  sendEmailOtp(data: { email: string }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/send-email-otp`, data);
  }

  verifyEmailOtp(data: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/verify-email-otp`, data);
  }

  // =================== FORGOT PASSWORD ===================

  sendPasswordResetOtp(email: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/send-otp`, { email });
  }

  verifyPasswordResetOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/verify-otp`, { email, otp });
  }

  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/reset`, { email, password: newPassword });
  }

  // =================== PHONE OTP ===================

  sendPhoneOtp(phone: string): Observable<any> {
    return this.http.post(`${this.BASE_API}/send-otp`, { phone });
  }

  verifyPhoneOtp(phone: string, otp: string): Observable<any> {
    return this.http.post(`${this.BASE_API}/verify-otp`, { phone, otp });
  }
}
