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
  styleUrls: ['./forgot-password.component.css']   // ← same file as login if you merge
})
export class ForgotPasswordComponent implements OnDestroy {

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

  otpBoxes: number[] = Array(6).fill(0);
  otpArray: string[] = ['', '', '', '', '', ''];

  timer = 60;
  private intervalId: any;

  constructor(
    private http: HttpClient,
    public router: Router
  ) {}

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

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
        Swal.fire('OTP Sent', 'Check your email', 'success');
      },
      error: (err: any) => {
        this.otpLoading = false;
        Swal.fire('Error', err.error?.message || 'Unable to send OTP', 'error');
      }
    });
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && !/^[0-9]$/.test(value)) {
      input.value = '';
      return;
    }

    this.otpArray[index] = value;

    if (value && index < 5) {
      const next = (input.nextElementSibling as HTMLInputElement);
      next?.focus();
    }

    this.otp = this.otpArray.join('');
    this.otpInvalid = false;
  }

  // Optional: better paste handling
  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.trim() || '';
    if (/^\d{6}$/.test(paste)) {
      this.otpArray = paste.split('');
      this.otp = paste;
      this.otpInvalid = false;
    }
  }

  // Optional: arrow key navigation
  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpArray[index] && index > 0) {
      const prev = (event.target as HTMLInputElement).previousElementSibling as HTMLInputElement;
      prev?.focus();
    }
  }

  verifyOtp(): void {
    this.otpInvalid = this.otp.length !== 6;
    if (this.otpInvalid) return;

    this.http.post<any>(
      'http://localhost:5000/api/forgot-password/verify-otp',
      { email: this.email, otp: this.otp }
    ).subscribe({
      next: () => {
        this.resetStage = true;
        Swal.fire('Verified', 'Now set your new password', 'success');
      },
      error: (err: any) => {
        Swal.fire('Invalid OTP', err.error?.message || 'Wrong code', 'error');
      }
    });
  }

  resetPassword(): void {
    this.passwordInvalid = this.newPassword.length < 6;
    this.confirmPasswordInvalid = this.newPassword !== this.confirmPassword;

    if (this.passwordInvalid || this.confirmPasswordInvalid) return;

    this.http.post<any>(
      'http://localhost:5000/api/forgot-password/reset',
      { email: this.email, password: this.newPassword }
    ).subscribe({
      next: () => {
        Swal.fire('Password Reset', 'You can now sign in', 'success')
          .then(() => this.router.navigate(['/login']));
      },
      error: (err: any) => {
        Swal.fire('Failed', err.error?.message || 'Try again', 'error');
      }
    });
  }

  startTimer(): void {
    this.timer = 60;
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  resendOtp(): void {
    this.otpArray = ['', '', '', '', '', ''];
    this.otp = '';
    this.otpInvalid = false;
    this.sendOtp();
  }
}