import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-researchers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-researchers.component.html',
  styleUrls: ['./admin-researchers.component.css']  // ✅ FIXED (plural)
})
export class AdminResearchersComponent implements OnInit {

  researchers: any[] = [];
  loading: boolean = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadResearchers();
  }

  // ✅ Load researchers from backend
  loadResearchers(): void {
    this.loading = true;

    this.adminService.getResearchers().subscribe({
      next: (res: any[]) => {
        this.researchers = res || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading researchers:', err);
        this.loading = false;
      }
    });
  }
}