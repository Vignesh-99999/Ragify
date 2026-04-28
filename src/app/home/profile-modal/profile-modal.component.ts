import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.css']
})
export class ProfileModalComponent implements OnInit {

  profileForm!: FormGroup;
  userData!: User;

  // existing close event
  @Output() closeModal = new EventEmitter<void>();

  // NEW event to notify parent component
  @Output() profileUpdated = new EventEmitter<void>();

  constructor(private fb: FormBuilder, private userService: UserService) { }

  ngOnInit(): void {

    // initialize form
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      password: [''] // optional
    });

    this.loadUserData();
  }

  // ================= FETCH USER DATA =================
  loadUserData() {

    this.userService.getProfile().subscribe({

      next: (res: User) => {

        this.userData = res;

        this.profileForm.patchValue({
          name: res.name || '',
          email: res.email || '',
          mobile: res.mobile || ''
        });

      },

      error: (err) => {
        console.error('Failed to load profile', err);
      }

    });
  }

  // ================= SAVE UPDATED PROFILE =================
  saveProfile() {

    if (this.profileForm.invalid) return;

    const updatedData = this.profileForm.value;

    this.userService.updateProfile(updatedData).subscribe({

      next: (res) => {

        // update navbar data in localStorage
        if (res?.name) {
          localStorage.setItem('userName', res.name);
        }

        if (res?.email) {
          localStorage.setItem('userEmail', res.email);
        }

        alert('Profile updated successfully');

        // notify parent component to refresh profile
        this.profileUpdated.emit();

        // close modal
        this.closeModal.emit();

      },

      error: (err) => {
        console.error('Failed to update profile', err);
      }

    });
  }

  // ================= CLOSE MODAL =================
  close() {
    this.closeModal.emit();
  }

}
