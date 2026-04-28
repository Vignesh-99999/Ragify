import {
  Component, OnInit, Inject, PLATFORM_ID, HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

interface HistoryItem {
  mode: string;
  input: string;
  output: string;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.css']
})
export class AssistantComponent implements OnInit {

  isDarkMode = true;
  showAvatarDropdown = false;

  isLoggedIn = false;
  userName = '';
  userEmail = '';

  mode: 'rewrite' | 'brainstorm' | 'summarize' = 'rewrite';
  inputText = '';
  outputText = '';
  loading = false;
  error = '';
  copied = false;

  history: HistoryItem[] = [];

  toastVisible = false;
  toastMsg = '';
  private toastTimer: any;
  private copyTimer: any;

  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const token = localStorage.getItem('token');
      this.isLoggedIn = !!token;

      if (!this.isLoggedIn) {
        this.router.navigate(['/login']);
        return;
      }

      const role = localStorage.getItem('role');
      if (role !== 'researcher') {
        this.router.navigate(['/home']);
        return;
      }

      const savedTheme = localStorage.getItem('theme');
      this.isDarkMode = savedTheme !== 'light';
      this.userName = localStorage.getItem('userName') || 'User';
      this.userEmail = localStorage.getItem('userEmail') || '';
    }
  }

  /* ===== ASSISTANT ===== */
  async runAssistant(): Promise<void> {
    this.error = '';
    this.outputText = '';

    const trimmed = this.inputText.trim();
    if (!trimmed) {
      this.error = 'Please enter some text first.';
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.error = 'Please sign in to use the research assistant.';
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;

    try {
      // STEP 1: Call Flask / AI server
      const res = await fetch('http://localhost:5001/research-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode: this.mode, input: trimmed })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Assistant request failed');
      }

      const data = await res.json();
      this.outputText = data.result || '';

      // STEP 2: Save to Node / MongoDB
      await fetch('http://localhost:5000/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userEmail || '123',
          text: trimmed
        })
      });

      // Push to local history
      this.history.unshift({ mode: this.mode, input: trimmed, output: this.outputText });
      if (this.history.length > 10) this.history.pop();

      this.showToast('Response generated!');

    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  /* ===== HISTORY ===== */
  loadHistory(item: HistoryItem): void {
    this.mode = item.mode as any;
    this.inputText = item.input;
    this.outputText = item.output;
    this.error = '';
  }

  /* ===== CLEAR ===== */
  clearAll(): void {
    this.inputText = '';
    this.outputText = '';
    this.error = '';
    this.copied = false;
  }

  /* ===== COPY ===== */
  copyOutput(): void {
    if (!this.isBrowser || !this.outputText) return;
    navigator.clipboard.writeText(this.outputText).then(() => {
      this.copied = true;
      this.showToast('Response copied!');
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => { this.copied = false; }, 2500);
    });
  }

  /* ===== WORD COUNT ===== */
  get wordCount(): number {
    return this.outputText.trim() ? this.outputText.trim().split(/\s+/).length : 0;
  }

  /* ===== TOAST ===== */
  showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2800);
  }

  /* ===== THEME ===== */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isBrowser) localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  /* ===== AVATAR DROPDOWN ===== */
  toggleAvatarDropdown(e: MouseEvent): void {
    e.stopPropagation();
    this.showAvatarDropdown = !this.showAvatarDropdown;
  }

  @HostListener('document:click')
  closeDropdown(): void { this.showAvatarDropdown = false; }

  /* ===== LOGOUT ===== */
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
    }
    this.router.navigate(['/login']);
  }

  /* ===== MOUSE PARALLAX ===== */
  onMove(e: MouseEvent): void {
    if (!this.isBrowser) return;
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mx', `${x}%`);
    document.documentElement.style.setProperty('--my', `${y}%`);
  }
}