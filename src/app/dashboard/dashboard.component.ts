import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit, OnDestroy {

  totalUsers = 0;
  totalResearchers = 0;

  chart: any;
  intervalId: any;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.loadAnalytics();

    // 🔄 Auto refresh
    this.intervalId = setInterval(() => {
      this.loadAnalytics();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadAnalytics() {
    this.http.get<any>('http://localhost:5000/api/admin/analytics')
      .subscribe(data => {

        console.log("API DATA:", data);

        this.totalUsers = data.totalUsers;
        this.totalResearchers = data.totalResearchers;

        this.drawChart(data);
      });
  }

  drawChart(data: any) {
  setTimeout(() => {

    const canvas = document.getElementById('analyticsChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    // 🌈 Gradient generator
    const createGradient = (c1: string, c2: string) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, c1);
      gradient.addColorStop(1, c2);
      return gradient;
    };

    const gradients = [
      createGradient('#6366f1', '#8b5cf6'),
      createGradient('#22c55e', '#4ade80'),
      createGradient('#f97316', '#fb923c'),
      createGradient('#a855f7', '#c084fc'),
      createGradient('#06b6d4', '#67e8f9'),
      createGradient('#facc15', '#fde047'),
      createGradient('#ec4899', '#f472b6')
    ];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Chatbot',
          'AI Assistant',
          'Video Analyzer',
          'MCQs',
          'Flashcards',
          'Summary',
          'Q&A'
        ],
        datasets: [{
          label: 'Usage Analytics',
          data: [
            data.chatbotCount || 0,
            data.aiCount || 0,
            data.videoCount || 0,
            data.mcqCount || 0,
            data.flashcardCount || 0,
            data.summaryCount || 0,
            data.qaCount || 0
          ],

          backgroundColor: gradients,

          borderRadius: 30,
          borderSkipped: false,

          barThickness: 50,

          // 🔥 Shadow effect (fake glow)
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',

          hoverBackgroundColor: gradients
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        animation: {
          duration: 2000,
          easing: 'easeOutBounce'
        },

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#fff',
            bodyColor: '#cbd5f5',
            padding: 16,
            cornerRadius: 14,
            displayColors: false,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context: any) => `🔥 Usage: ${context.raw}`
            }
          }
        },

        scales: {
          x: {
            ticks: {
              color: '#1e293b',
              font: {
                size: 14,
                weight: 'bold' as const
              }
            },
            grid: {
              display: false
            }
          },

          y: {
            beginAtZero: true,
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.04)'
            },
            border: {
              display: false
            }
          }
        },

        hover: {
          mode: 'nearest',
          intersect: true
        }
      }
    });

  }, 100);
}
}