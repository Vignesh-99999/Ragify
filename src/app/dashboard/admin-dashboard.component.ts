import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule // ✅ REQUIRED for router-outlet
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  totalUsers = 0;

  ngOnInit() {
    this.getTotalUsers();
  }

  getTotalUsers() {
    fetch('http://localhost:5000/api/admin/users/count')
      .then(res => res.json())
      .then(data => {
        this.totalUsers = data.totalUsers;
      });
  }


  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
