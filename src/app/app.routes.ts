import { Routes } from '@angular/router';
import { SignupComponent } from './signup/signup.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LandingComponent } from './landing/landing.component';
import { HomeComponent } from './home/home.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { GoogleSuccessComponent } from './google-success/google-success.component';
import { PaymentComponent } from './payment/payment.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [

  { path: '', component: LandingComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent,canActivate: [AuthGuard] },
  { path: 'google-success', component: GoogleSuccessComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent,canActivate: [AuthGuard] },
  { path: 'chatbot', component: ChatbotComponent},
  { path: 'payment', component: PaymentComponent },

  // ❌ REMOVED (causes sidebar bypass)
  // { path: 'admin-dashboard', component: AdminDashboardComponent },

  // ✅ ADMIN LAYOUT ROUTES (SIDEBAR PERSISTENT)
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },

      {
        path: 'users',
        loadComponent: () =>
          import('./admin/admin-users/admin-users.component')
            .then(m => m.AdminUsersComponent)
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '' }
];
