import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-google-success',
  templateUrl: './google-success.component.html',
  styleUrls: ['./google-success.component.css']
})
export class GoogleSuccessComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      localStorage.setItem('token', token);
      // Fetch user details so navbars can show name/email
      this.auth.getCurrentUser().subscribe({
        next: (user: any) => {
          if (user) {
            localStorage.setItem('userName', user.name || 'User');
            localStorage.setItem('userEmail', user.email || '');
            localStorage.setItem('role', user.role || 'user');
          }
          this.router.navigate(['/home']);
        },
        error: () => {
          this.router.navigate(['/home']);
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}
