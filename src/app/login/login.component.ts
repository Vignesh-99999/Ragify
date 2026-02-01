import {
  Component,
  HostListener,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  /* -------------------- STATE -------------------- */
  loginRole: 'user' | 'admin' = 'user';
  loginType: 'password' | 'google' = 'password';

  phone = '';
  password = '';
  email = '';
  otp = '';

  otpSent = false;
  otpLoading = false;
  otpSuccess = false;

  showPassword = false;

  // Admin
  adminEmail = '';
  adminPassword = '';

  /* -------------------- VALIDATION FLAGS -------------------- */
  phoneInvalid = false;
  passwordInvalid = false;
  emailInvalid = false;
  otpInvalid = false;
  adminEmailInvalid = false;
  adminPasswordInvalid = false;

  /* -------------------- ROBOT EYES -------------------- */
  eyeLeftX = 0;
  eyeLeftY = 0;
  eyeRightX = 0;
  eyeRightY = 0;

  private readonly MAX_EYE_MOVE = 6;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}
  ngOnDestroy(): void {}

  /* -------------------- PASSWORD TOGGLE -------------------- */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /* -------------------- EYE TRACKING -------------------- */
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const robot = document.querySelector('.robot-container') as HTMLElement;
    if (!robot) return;

    const rect = robot.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    const moveX = this.clamp((dx / distance) * this.MAX_EYE_MOVE, -this.MAX_EYE_MOVE, this.MAX_EYE_MOVE);
    const moveY = this.clamp((dy / distance) * this.MAX_EYE_MOVE, -this.MAX_EYE_MOVE, this.MAX_EYE_MOVE);

    this.eyeLeftX = moveX;
    this.eyeLeftY = moveY;
    this.eyeRightX = moveX;
    this.eyeRightY = moveY;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /* -------------------- USER PASSWORD LOGIN -------------------- */
  loginWithPassword(): void {
    this.phoneInvalid = !this.phone || this.phone.trim().length !== 10;
    this.passwordInvalid = !this.password || this.password.trim().length < 6;
    if (this.phoneInvalid || this.passwordInvalid) return;

    this.auth.loginWithPassword({
      mobile: this.phone.trim(),
      password: this.password.trim()
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', 'user');

        Swal.fire('Login Successful 🎉', 'Welcome back!', 'success')
          .then(() => this.router.navigate(['/home']));
      },
      error: (err) => {
        if (err?.status === 403) {
          Swal.fire('Account Banned 🚫', err.error?.message, 'error');
          return;
        }

        Swal.fire('Login Failed', err.error?.message || 'Invalid credentials', 'error');
      }
    });
  }

  /* -------------------- EMAIL OTP LOGIN -------------------- */
  sendEmailOtp(): void {
    this.emailInvalid = !this.email || !this.email.includes('@');
    if (this.emailInvalid) return;

    this.otpLoading = true;
    this.otpSuccess = false;

    this.auth.sendEmailOtp({ email: this.email }).subscribe({
      next: () => {
        this.otpLoading = false;
        this.otpSent = true;
        this.otpSuccess = true;

        Swal.fire('OTP Sent ✅', 'Check your email', 'success');
      },
      error: (err) => {
        this.otpLoading = false;

        if (err?.status === 403) {
          Swal.fire('Account Banned 🚫', err.error?.message, 'error');
          return;
        }

        Swal.fire('OTP Failed', 'Unable to send OTP', 'error');
      }
    });
  }

  verifyEmailOtp(): void {
    this.otpInvalid = !this.otp;
    if (this.otpInvalid) return;

    this.auth.verifyEmailOtp({
      email: this.email,
      otp: this.otp
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);

        Swal.fire('Login Successful 🎉', 'You are now logged in', 'success')
          .then(() => this.router.navigate(['/home']));
      },
      error: (err) => {
        if (err?.status === 403) {
          Swal.fire('Account Banned 🚫', err.error?.message, 'error');
          return;
        }

        Swal.fire('Invalid OTP', 'Please enter correct OTP', 'error');
      }
    });
  }

  /* -------------------- GOOGLE LOGIN -------------------- */
  loginWithGooglePopup(): void {
    window.location.href = 'http://localhost:5000/api/auth/google';
  }

  /* -------------------- ADMIN LOGIN -------------------- */
  loginAdmin(): void {
    this.adminEmailInvalid = !this.adminEmail || !this.adminEmail.includes('@');
    this.adminPasswordInvalid = !this.adminPassword || this.adminPassword.trim().length < 6;
    if (this.adminEmailInvalid || this.adminPasswordInvalid) return;

    this.auth.loginAdmin({
      email: this.adminEmail,
      password: this.adminPassword
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', 'admin');

        Swal.fire('Admin Login Successful 🛡', '', 'success')
          .then(() => this.router.navigate(['/admin/dashboard']));
      },
      error: () => {
        Swal.fire('Admin Login Failed', 'Invalid admin credentials', 'error');
      }
    });
  }
}
