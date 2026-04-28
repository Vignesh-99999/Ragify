import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private BASE_API = 'http://localhost:5000/api';
  private AUTH_API = `${this.BASE_API}/auth`;
  private ADMIN_API = `${this.BASE_API}/admin`;
  private FORGOT_API = `${this.BASE_API}/forgot-password`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ================= SAFE TOKEN HANDLER =================
  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');

      if (!token || token === 'undefined' || token === 'null') {
        return null;
      }

      return token;
    }
    return null;
  }

  private setToken(token: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  private setUserData(data: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('role', data.role || 'user');
      localStorage.setItem('userName', data.user?.name || 'User');
      localStorage.setItem('userEmail', data.user?.email || '');
      localStorage.setItem('isLoggedIn', 'true');
    }
  }

  // =================== USER AUTH ===================

  signup(data: {
    name: string;
    email: string;
    mobile: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/signup`, data);
  }

  loginWithPassword(data: { mobile: string; password: string }): Observable<any> {
    return new Observable(observer => {
      this.http.post(`${this.AUTH_API}/login`, data).subscribe({
        next: (res: any) => {
          if (res?.token) {
            this.setToken(res.token);
            this.setUserData(res);
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  loginWithGoogle(): Observable<any> {
    return this.http.get(`${this.AUTH_API}/google`, { responseType: 'text' });
  }

  // ================= CURRENT USER =================

  getCurrentUser(): Observable<any> {
    const token = this.getToken();

    if (!token) {
      return of(null);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.AUTH_API}/me`, { headers });
  }

  // ================= UPGRADE =================

  upgradeToResearcher(): Observable<any> {
    const token = this.getToken();

    if (!token) {
      console.error("❌ NO TOKEN FOUND");
      return throwError(() => new Error('Invalid token'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return new Observable(observer => {
      this.http.post(`${this.AUTH_API}/upgrade-to-researcher`, {}, { headers })
        .subscribe({
          next: (res: any) => {

            // ✅ UPDATE TOKEN + ROLE AFTER UPGRADE
            if (res?.token) {
              this.setToken(res.token);
              this.setUserData(res);
            }

            observer.next(res);
            observer.complete();
          },
          error: (err) => {
            console.error("❌ UPGRADE FAILED:", err);
            observer.error(err);
          }
        });
    });
  }

  // =================== ADMIN ===================

  loginAdmin(data: { email: string; password: string }): Observable<any> {
    return new Observable(observer => {
      this.http.post(`${this.ADMIN_API}/login`, data).subscribe({
        next: (res: any) => {
          if (res?.token) {
            this.setToken(res.token);
            this.setUserData({
              role: 'admin',
              user: { name: data.email }
            });
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  // ================= EMAIL OTP =================

  sendEmailOtp(data: { email: string }): Observable<any> {
    return this.http.post(`${this.AUTH_API}/send-email-otp`, data);
  }

  verifyEmailOtp(data: { email: string; otp: string }): Observable<any> {
    return new Observable(observer => {
      this.http.post(`${this.AUTH_API}/verify-email-otp`, data).subscribe({
        next: (res: any) => {
          if (res?.token) {
            this.setToken(res.token);
            this.setUserData(res);
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  // ================= FORGOT PASSWORD =================

  sendPasswordResetOtp(email: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/send-otp`, { email });
  }

  verifyPasswordResetOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/verify-otp`, { email, otp });
  }

  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.FORGOT_API}/reset`, {
      email,
      password: newPassword
    });
  }

  // ================= PHONE OTP =================

  sendPhoneOtp(phone: string): Observable<any> {
    return this.http.post(`${this.BASE_API}/send-otp`, { phone });
  }

  verifyPhoneOtp(phone: string, otp: string): Observable<any> {
    return this.http.post(`${this.BASE_API}/verify-otp`, { phone, otp });
  }

  // ================= LOGOUT =================

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
  }
}