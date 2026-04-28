import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit, OnInit {

  loginRole: 'user' | 'admin' = 'user';
  loginType: 'password' | 'google' = 'password';
  videoSupported = true;

  phone = '';
  password = '';
  email = '';
  otp = '';
  otpSent = false;
  otpLoading = false;
  showPassword = false;

  adminEmail = '';
  adminPassword = '';

  phoneInvalid = false;
  passwordInvalid = false;
  emailInvalid = false;
  adminEmailInvalid = false;
  adminPasswordInvalid = false;

  isBrowser: boolean;

  @ViewChild('chatVideo') chatVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.checkVideoSupport();
  }

  /* ================= GOOGLE TOKEN CAPTURE ================= */
  ngOnInit() {
    if (!this.isBrowser) return;

    this.route.queryParams.subscribe(params => {
      const token = params['token'];

      if (token && token !== 'undefined' && token !== 'null') {

        console.log('✅ Google Token Received:', token);

        localStorage.setItem('token', token);
        localStorage.setItem('isLoggedIn', 'true');

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));

          localStorage.setItem('role', payload.role || 'user');
          localStorage.setItem('userName', payload.name || 'User');

        } catch (e) {
          console.error('Token decode error', e);
        }

        Swal.fire('Google Login Successful', '', 'success')
          .then(() => this.router.navigate(['/home']));
      }
    });
  }

  /* ================= VIDEO ================= */
  ngAfterViewInit() {
    if (!this.isBrowser) return;

    const video = this.chatVideo?.nativeElement;
    if (video) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.poster = "assets/img/chat-poster.jpg";
        });
      }
    }
  }

  private checkVideoSupport() {
    if (!this.isBrowser) return;

    const video = document.createElement('video');
    this.videoSupported = !!(
      video.canPlayType('video/mp4') ||
      video.canPlayType('video/webm')
    );
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /* ================= USER PASSWORD LOGIN ================= */
  loginWithPassword() {
    if (!this.isBrowser) return;

    this.phoneInvalid = !this.phone || this.phone.trim().length !== 10;
    this.passwordInvalid = !this.password || this.password.trim().length < 8;

    if (this.phoneInvalid || this.passwordInvalid) return;

    this.auth.loginWithPassword({
      mobile: this.phone.trim(),
      password: this.password.trim()
    }).subscribe({
      next: (res: any) => {

        console.log('✅ Login Response:', res);

        if (!res.token) {
          Swal.fire('Error', 'Token not received from server', 'error');
          return;
        }

        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', res.user?.name || this.phone);

        Swal.fire('Welcome back!', '', 'success')
          .then(() => this.router.navigate(['/home']));
      },
      error: (err) => {
        Swal.fire('Login failed', err.error?.message || 'Invalid credentials', 'error');
      }
    });
  }

  /* ================= EMAIL OTP LOGIN ================= */
  sendEmailOtp() {
    this.emailInvalid = !this.email || !this.email.includes('@');
    if (this.emailInvalid) return;

    this.otpLoading = true;

    this.auth.sendEmailOtp({ email: this.email }).subscribe({
      next: () => {
        this.otpLoading = false;
        this.otpSent = true;
        Swal.fire('OTP sent', 'Check your email', 'success');
      },
      error: () => {
        this.otpLoading = false;
        Swal.fire('Error', 'Could not send OTP', 'error');
      }
    });
  }

  verifyEmailOtp() {
    if (!this.otp) return;

    this.auth.verifyEmailOtp({
      email: this.email,
      otp: this.otp
    }).subscribe({
      next: (res: any) => {

        if (!res.token) {
          Swal.fire('Error', 'Token not received', 'error');
          return;
        }

        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', res.name || this.email);

        Swal.fire('Success!', 'You are now logged in', 'success')
          .then(() => this.router.navigate(['/home']));
      },
      error: () => {
        Swal.fire('Invalid OTP', '', 'error');
      }
    });
  }

  /* ================= GOOGLE LOGIN ================= */
  loginWithGooglePopup() {
    if (!this.isBrowser) return;

    window.location.href = 'http://localhost:5000/api/auth/google';
  }

  /* ================= ADMIN LOGIN ================= */
  loginAdmin() {
    if (!this.isBrowser) return;

    this.adminEmailInvalid = !this.adminEmail || !this.adminEmail.includes('@');
    this.adminPasswordInvalid = !this.adminPassword || this.adminPassword.trim().length < 6;

    if (this.adminEmailInvalid || this.adminPasswordInvalid) return;

    this.auth.loginAdmin({
      email: this.adminEmail,
      password: this.adminPassword
    }).subscribe({
      next: (res: any) => {

        if (!res.token) {
          Swal.fire('Error', 'Token missing', 'error');
          return;
        }

        localStorage.setItem('token', res.token);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', this.adminEmail);

        Swal.fire('Admin access granted', '', 'success')
          .then(() => this.router.navigate(['/admin/dashboard']));
      },
      error: () => {
        Swal.fire('Access denied', 'Invalid credentials', 'error');
      }
    });
  }
}