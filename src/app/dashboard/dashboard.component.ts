import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h1>Welcome to Dashboard 🚀</h1>
      <p>Login successful</p>
    </div>
  `,
  styles: [`
    .dashboard {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-size: 22px;
    }
  `]
})
export class DashboardComponent {}
