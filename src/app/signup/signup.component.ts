import {
  Component,
  HostListener,
  OnInit,
  OnDestroy
} from '@angular/core';
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
export class SignupComponent implements OnInit, OnDestroy {

  /* -------------------- VALIDATION -------------------- */
  namePattern = '^[A-Za-z ]{3,}$';
  phonePattern = '^[0-9]{10}$';
  passwordPattern =
    '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$';

  /* -------------------- FORM MODEL -------------------- */
  user = {
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  };

  loading = false;

  /* -------------------- PASSWORD TOGGLE -------------------- */
  showPassword = false;
  showConfirmPassword = false;

  /* -------------------- ROBOT EYE MOVEMENT -------------------- */
  eyeLeftX = 0;
  eyeLeftY = 0;
  eyeRightX = 0;
  eyeRightY = 0;

  private readonly MAX_EYE_MOVE = 6; // prevents eyeballs going outside

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}
  ngOnDestroy(): void {}

  /* -------------------- PASSWORD VISIBILITY -------------------- */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
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

    const moveX = Math.max(
      -this.MAX_EYE_MOVE,
      Math.min(this.MAX_EYE_MOVE, (dx / distance) * this.MAX_EYE_MOVE)
    );

    const moveY = Math.max(
      -this.MAX_EYE_MOVE,
      Math.min(this.MAX_EYE_MOVE, (dy / distance) * this.MAX_EYE_MOVE)
    );

    this.eyeLeftX = moveX;
    this.eyeLeftY = moveY;
    this.eyeRightX = moveX;
    this.eyeRightY = moveY;
  }

  /* -------------------- SUBMIT -------------------- */
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

    this.auth.signup(this.user).subscribe({
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

        const message =
          err?.error?.message ||
          err?.error?.msg ||
          'Signup failed. Please try again.';

        if (message.toLowerCase().includes('email')) {
          Swal.fire({
            icon: 'warning',
            title: 'Email Already Exists',
            text: 'This email is already registered.',
            confirmButtonColor: '#667eea'
          });
        }
        else if (message.toLowerCase().includes('mobile')) {
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
            text: message,
            confirmButtonColor: '#667eea'
          });
        }
      }
    });
  }
}
