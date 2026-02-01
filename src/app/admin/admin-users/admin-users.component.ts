import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-users',
  standalone: true, 
  imports: [CommonModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent {
  users: any[] = [];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    fetch('http://localhost:5000/api/admin/users')
      .then(res => res.json())
      .then(data => {
        this.users = data;
      })
      .catch(err => console.error(err));
  }

  toggleBan(userId: string) {
    fetch(`http://localhost:5000/api/admin/users/${userId}/ban`, {
      method: 'PATCH'
    })
      .then(() => this.loadUsers());
  }

  toggleSuspend(userId: string) {
    fetch(`http://localhost:5000/api/admin/users/${userId}/suspend`, {
      method: 'PATCH'
    }).then(() => this.loadUsers());
  }

}
