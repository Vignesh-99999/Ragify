
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {

  namePattern = '^[A-Za-z ]{3,}$';
  phonePattern = '^[0-9]{10}$';
  passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$';

  user = {
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  };

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(form: NgForm): void {

    if (form.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please fill all required fields correctly',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    if (this.user.password !== this.user.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    this.loading = true;

    const signupData = {
      name: this.user.name,
      email: this.user.email,
      mobile: this.user.mobile,
      password: this.user.password
    };

    this.auth.signup(signupData).subscribe({

      next: () => {

        this.loading = false;

        Swal.fire({
          icon: 'success',
          title: 'Signup Successful 🎉',
          text: 'Your account has been created successfully',
          confirmButtonColor: '#667eea'
        }).then(() => {
          this.router.navigate(['/login']);
        });

      },

      error: (err) => {

        this.loading = false;

        const backendMessage =
          err?.error?.message ||
          err?.error?.msg ||
          '';

        const message = backendMessage.toLowerCase();

        if (message.includes('email')) {

          Swal.fire({
            icon: 'warning',
            title: 'Email Already Exists',
            text: 'This email is already registered.',
            confirmButtonColor: '#667eea'
          });

        }
        else if (message.includes('mobile') || message.includes('mobile_exists')) {

          Swal.fire({
            icon: 'warning',
            title: 'Mobile Number Exists',
            text: 'This mobile number is already registered.',
            confirmButtonColor: '#667eea'
          });

        }
        else {

          Swal.fire({
            icon: 'error',
            title: 'Signup Failed',
            text: backendMessage || 'Signup failed. Please try again.',
            confirmButtonColor: '#667eea'
          });

        }
      }
    });
  }
}
