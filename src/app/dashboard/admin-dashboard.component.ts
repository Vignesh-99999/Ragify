import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

// ✅ FIX PATH (VERY IMPORTANT)
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  totalUsers = 0;
  totalResearchers = 0; // ✅ ADD THIS
  chart: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private adminService: AdminService // ✅ ADD THIS
  ) {}

  ngOnInit() {
    this.getTotalUsers();
    this.loadResearcherCount(); // ✅ CALL THIS
    // this.loadAnalytics(); 
  }

  getTotalUsers() {
    this.http.get<any>('http://localhost:5000/api/admin/users/count')
      .subscribe(res => {
        this.totalUsers = res.totalUsers;
      });
  }

  loadResearcherCount() {
    this.adminService.getResearcherCount().subscribe({
      next: (res) => {
        this.totalResearchers = res.count;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }


//   loadAnalytics() {
//     this.http.get<any>('http://localhost:5000/api/admin/analytics')
//       .subscribe(data => {

//         console.log("📊 Analytics Data:", data);

//         this.drawChart(data);
//       });
//   }

//  drawChart(data: any) {

//     setTimeout(() => {

//       const canvas = document.getElementById('analyticsChart') as HTMLCanvasElement;

//       if (!canvas) {
//         console.error("❌ Canvas not found");
//         return;
//       }

//       const ctx = canvas.getContext('2d');

//       if (!ctx) {
//         console.error("❌ Context not found");
//         return;
//       }

//       if (this.chart) {
//         this.chart.destroy();
//       }

//       this.chart = new Chart(ctx, {
//         type: 'bar',
//         data: {
//           labels: [
//             'Chatbot',
//             'AI Assistant',
//             'Video Analyzer',
//             'MCQs',
//             'Flashcards',
//             'Summary',
//             'Q&A'
//           ],
//           datasets: [{
//             label: 'Usage',
//             data: [
//               data.chatbotCount || 0,
//               data.aiCount || 0,
//               data.videoCount || 0,
//               data.mcqCount || 0,
//               data.flashcardCount || 0,
//               data.summaryCount || 0,
//               data.qaCount || 0
//             ],
//             backgroundColor: [
//               '#4CAF50',
//               '#2196F3',
//               '#FF9800',
//               '#9C27B0',
//               '#00BCD4',
//               '#FFC107',
//               '#E91E63'
//             ]
//           }]
//         },
//         options: {
//           responsive: true,
//           maintainAspectRatio: false
//         }
//       });

//     }, 300);
//   }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}