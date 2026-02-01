import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnDestroy {

  // ================= BASIC FIELDS =================
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';

  otpSent = false;
  resetStage = false;
  otpLoading = false;

  emailInvalid = false;
  otpInvalid = false;
  passwordInvalid = false;
  confirmPasswordInvalid = false;

  showPassword = false;

  // ================= OTP BOX LOGIC =================
  otpBoxes: number[] = Array(6).fill(0);
  otpArray: string[] = ['', '', '', '', '', ''];

  timer = 60;
  private intervalId: any;

  constructor(
    private http: HttpClient,
    public router: Router
  ) {}

  // ================= CLEANUP =================
  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // ================= NAV =================
  backToLogin(): void {
    this.router.navigate(['/login']);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ================= SEND OTP =================
  sendOtp(): void {
    this.emailInvalid = !this.email || !this.email.includes('@');
    if (this.emailInvalid) return;

    this.otpLoading = true;

    this.http.post<any>(
      'http://localhost:5000/api/forgot-password/send-otp',
      { email: this.email }
    ).subscribe({
      next: () => {
        this.otpLoading = false;
        this.otpSent = true;
        this.resetStage = false;
        this.startTimer();
        Swal.fire('OTP Sent ✅', 'Check your email', 'success');
      },
      error: (err: any) => {
        this.otpLoading = false;
        Swal.fire(
          'Error ❌',
          err.error?.message || 'Unable to send OTP',
          'error'
        );
      }
    });
  }

  // ================= OTP INPUT =================
  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^[0-9]$/.test(value)) {
      input.value = '';
      return;
    }

    this.otpArray[index] = value;

    if (index < this.otpBoxes.length - 1) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      nextInput?.focus();
    }

    this.otp = this.otpArray.join('');
  }

  // ================= VERIFY OTP =================
  verifyOtp(): void {
    this.otpInvalid = this.otp.length !== 6;
    if (this.otpInvalid) return;

    this.http.post<any>(
      'http://localhost:5000/api/forgot-password/verify-otp',
      { email: this.email, otp: this.otp }
    ).subscribe({
      next: () => {
        this.resetStage = true;
        Swal.fire('OTP Verified ✅', 'Now reset your password', 'success');
      },
      error: (err: any) => {
        Swal.fire(
          'Invalid OTP ❌',
          err.error?.message || 'Wrong OTP',
          'error'
        );
      }
    });
  }

  // ================= RESET PASSWORD =================
  resetPassword(): void {
    this.passwordInvalid = this.newPassword.length < 6;
    this.confirmPasswordInvalid = this.newPassword !== this.confirmPassword;

    if (this.passwordInvalid || this.confirmPasswordInvalid) return;

    this.http.post<any>(
      'http://localhost:5000/api/forgot-password/reset',
      { email: this.email, password: this.newPassword }
    ).subscribe({
      next: () => {
        Swal.fire(
          'Password Reset ✅',
          'Login with your new password',
          'success'
        ).then(() => this.router.navigate(['/login']));
      },
      error: (err: any) => {
        Swal.fire(
          'Reset Failed ❌',
          err.error?.message || 'Try again',
          'error'
        );
      }
    });
  }

  // ================= TIMER =================
  startTimer(): void {
    this.timer = 60;
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      this.timer--;
      if (this.timer === 0) clearInterval(this.intervalId);
    }, 1000);
  }

  resendOtp(): void {
    this.otpArray = ['', '', '', '', '', ''];
    this.otp = '';
    this.sendOtp();
  }
}
