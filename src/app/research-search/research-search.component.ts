import {
  Component, OnInit, Inject, PLATFORM_ID, HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-research-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './research-search.component.html',
  styleUrls: ['./research-search.component.css']
})
export class ResearchSearchComponent implements OnInit {

  isDarkMode = true;
  showAvatarDropdown = false;
  loading = false;
  query = '';
  lastQuery = '';
  results: any[] = [];

  isLoggedIn = true;
  isResearcher = true;
  userName = '';
  userEmail = '';

  // Filters
  activeTimeFilter = 'any';
  activeSortBy = 'relevance';
  activeType = 'all';

  timeFilters = [
    { label: 'Any time',   value: 'any'   },
    { label: 'Since 2026', value: '2026'  },
    { label: 'Since 2025', value: '2025'  },
    { label: 'Since 2024', value: '2024'  },
    { label: 'Since 2020', value: '2020'  },
  ];

  sortOptions = [
    { label: 'Relevance',   value: 'relevance'   },
    { label: 'Most Recent', value: 'date'         },
    { label: 'Most Cited',  value: 'cited'        },
  ];

  typeFilters = [
    { label: 'All',         value: 'all',         icon: 'pi-list'        },
    { label: 'Articles',    value: 'articles',    icon: 'pi-file'        },
    { label: 'PDF Only',    value: 'pdf',         icon: 'pi-file-pdf'    },
    { label: 'Reviews',     value: 'reviews',     icon: 'pi-star'        },
  ];

  suggestedTopics = [
    'Machine Learning', 'Transformer Architecture',
    'Large Language Models', 'RAG Systems',
    'Computer Vision', 'Quantum Computing',
  ];

  // Cite modal
  citeModal = false;
  activeCiteModal: any = null;
  activeCiteFormat = 'APA';
  citeFormats = ['APA', 'MLA', 'BibTeX', 'Chicago'];

  // Toast
  toastVisible = false;
  toastMsg = '';
  private toastTimer: any;

  private isBrowser: boolean;
  private readonly apiBase = 'http://localhost:5001';

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme');
      this.isDarkMode = savedTheme !== 'light';
      this.userName = localStorage.getItem('userName') || 'User';
      this.userEmail = localStorage.getItem('userEmail') || '';
    }
  }

  /* ===== SEARCH ===== */
  search(): void {
  if (!this.query.trim()) return;

  this.lastQuery = this.query;  // ✅ ADD THIS LINE

  this.loading = true;

  this.http.get<any>(`http://localhost:5000/api/search?q=${this.query}`)
    .subscribe({
      next: (res) => {
        this.results = res.results;
        this.loading = false;
      },
      error: () => this.loading = false
    });
}

  quickSearch(topic: string): void {
    this.query = topic;
    this.search();
  }

  clearResults(): void {
    this.results = [];
    this.lastQuery = '';
    this.query = '';
  }

  /* ===== SAVE PAPER ===== */
  toggleSave(paper: any): void {
    paper.saved = !paper.saved;
    this.showToast(paper.saved ? 'Paper saved!' : 'Removed from saved');
  }

  /* ===== CITE MODAL ===== */
  openCite(paper: any): void {
    this.activeCiteModal = paper;
    this.activeCiteFormat = 'APA';
    this.citeModal = true;
  }

  getCitation(format: string): string {
    const p = this.activeCiteModal;
    if (!p) return '';
    const year = p.year || 'n.d.';
    const authors = p.authors || 'Unknown Author';
    const title = p.title || 'Untitled';
    const source = p.source || 'Unknown Source';
    const link = p.link || '';

    switch (format) {
      case 'APA':
        return `${authors} (${year}). ${title}. ${source}. ${link}`;
      case 'MLA':
        return `${authors}. "${title}." ${source}, ${year}. Web. ${link}`;
      case 'BibTeX':
        return `@article{ref${year},\n  author = {${authors}},\n  title = {${title}},\n  journal = {${source}},\n  year = {${year}},\n  url = {${link}}\n}`;
      case 'Chicago':
        return `${authors}. "${title}." ${source} (${year}). ${link}.`;
      default:
        return '';
    }
  }

  copyCitation(): void {
    if (!this.isBrowser) return;
    const text = this.getCitation(this.activeCiteFormat);
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Citation copied!');
      this.citeModal = false;
    });
  }

  /* ===== SHARE ===== */
  copyLink(link: string): void {
    if (!this.isBrowser || !link) return;
    navigator.clipboard.writeText(link).then(() => this.showToast('Link copied!'));
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