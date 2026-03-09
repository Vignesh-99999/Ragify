import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  tilt = 'rotateX(0deg) rotateY(0deg)';
  isLoggedIn = false;
  userName = '';
  userEmail = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.syncFromStorage();
  }

  private syncFromStorage(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
    this.userName = localStorage.getItem('userName') || 'User';
    this.userEmail = localStorage.getItem('userEmail') || '';
  }

  onMove(e: MouseEvent) {
    const x = (window.innerWidth / 2 - e.clientX) / 35;
    const y = (window.innerHeight / 2 - e.clientY) / 35;
    this.tilt = `rotateX(${y}deg) rotateY(${-x}deg)`;
  }

  goToChatbot(): void {
    this.router.navigate(['/chatbot']);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    this.syncFromStorage();
    this.router.navigate(['/login']);
  }
}
