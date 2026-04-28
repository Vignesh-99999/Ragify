import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, Inject, PLATFORM_ID, HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileModalComponent } from './profile-modal/profile-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProfileModalComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // UI STATE
  tilt = 'none';
  isDarkMode = true;
  showAvatarDropdown = false;
  showUpgradeModal = false;
  showProfileModal = false;

  // USER STATE
  isLoggedIn = false;
  userName = '';
  userEmail = '';
  userRole: 'user' | 'researcher' | 'admin' | '' = '';

  newsletterEmail = '';

  // INTERNAL
  private isBrowser = false;
  private animationId: number | null = null;
  private resizeHandler?: () => void;

  private particles: { x: number; y: number; z: number }[] = [];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /* ===================== LIFECYCLE ===================== */

  ngOnInit(): void {
    if (this.isBrowser) this.loadUser();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.initParticles(), 100);
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  /* ===================== GLOBAL CLICK ===================== */

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-avatar-wrap')) {
      this.showAvatarDropdown = false;
    }
  }

  /* ===================== USER ===================== */

  private loadUser(): void {
    const token = localStorage.getItem('token');

    this.isLoggedIn = !!token;
    this.userName = localStorage.getItem('userName') || 'User';
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.userRole = (localStorage.getItem('role') as any) || '';
  }

  reloadUserProfile(): void {
    if (this.isBrowser) this.loadUser();
  }

  logout(): void {
    this.showAvatarDropdown = false;

    if (this.isBrowser) {
      ['token', 'role', 'userName', 'userEmail'].forEach(k =>
        localStorage.removeItem(k)
      );
    }

    this.loadUser();
    this.router.navigate(['/login']);
  }

  get isResearcher(): boolean {
    return this.userRole === 'researcher';
  }

  /* ===================== PARTICLE SPHERE ===================== */

  private initParticles(): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const COUNT = 280;
    const RADIUS = 190;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 500;
      canvas.height = rect?.height || 500;
    };

    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    this.particles = Array.from({ length: COUNT }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = RADIUS * (0.6 + Math.random() * 0.4);

      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      };
    });

    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.002;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const projected = this.particles.map(p => {
        const rx = p.x * cos - p.z * sin;
        const rz = p.x * sin + p.z * cos;

        const scale = 500 / (500 + rz + RADIUS);

        return {
          x: cx + rx * scale,
          y: cy + p.y * scale,
          alpha: (rz + RADIUS) / (2 * RADIUS),
          size: scale * 1.4
        };
      });

      // lines
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;

          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 28) {
            ctx.globalAlpha = (1 - dist / 28) * 0.12;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // dots
      projected.forEach(p => {
        ctx.globalAlpha = p.alpha * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  /* ===================== UI ===================== */

  onMove(e: MouseEvent): void {
    if (!this.isBrowser) return;

    const x = (window.innerWidth / 2 - e.clientX) / 40;
    const y = (window.innerHeight / 2 - e.clientY) / 40;

    this.tilt = `rotateX(${y}deg) rotateY(${-x}deg)`;
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  toggleAvatarDropdown(e: MouseEvent): void {
    e.stopPropagation();
    this.showAvatarDropdown = !this.showAvatarDropdown;
  }

  openManageAccount(): void {
    this.showAvatarDropdown = false;
    this.showProfileModal = true;
  }

  /* ===================== NAVIGATION ===================== */

  goToChatbot(): void {
    this.router.navigate(['/chatbot']);
  }

  onAssistantClick(): void {
    if (!this.isLoggedIn || !this.isResearcher) {
      this.showUpgradeModal = true;
      return;
    }
    this.router.navigate(['/assistant']);
  }

  onSearchClick(): void {
    if (!this.isLoggedIn || !this.isResearcher) {
      this.showUpgradeModal = true;
      return;
    }
    this.router.navigate(['/search']);
  }

  goToUpgrade(): void {
    this.showUpgradeModal = false;
    this.router.navigate(['/payment']);
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }

  openProfileModal(): void {
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }
}