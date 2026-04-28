import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

type ModeType = 'qa' | 'summarize' | 'flashcards' | 'mcq';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ChatbotComponent implements OnInit, OnDestroy {

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isDarkMode = true;
  sidebarOpen = true;
  isLoading = false;

  isLoggedIn = false;
  userName = 'Guest User';
  userEmail = '';

  private readonly apiBase = 'http://localhost:5001';
  private isBrowser = false;

  messages: any[] = [];
  documents: any[] = [];
  filteredDocuments: any[] = [];

  currentDocumentId: string | null = null;
  currentConversationId: string | null = null;

  userInput = '';
  selectedMode: ModeType = 'qa';

  searchQuery = '';
  modeDropdownOpen = false;

  conversationCount = 0;
  maxConversationLimit = 5;

  modeOptions: {
    value: ModeType;
    label: string;
    icon: string;
    bg: string;
    desc: string;
  }[] = [
    { value: 'qa', label: 'Q&As', icon: '💬', bg: '#e8f4fe', desc: 'Ask questions from the PDF' },
    { value: 'flashcards', label: 'Flashcards', icon: '🃏', bg: '#eef4e8', desc: 'Generate study flashcards' },
    { value: 'summarize', label: 'Summarize', icon: '📋', bg: '#fef6e4', desc: 'Get a concise summary' },
    { value: 'mcq', label: 'MCQs', icon: '✅', bg: '#f4e8fe', desc: 'Multiple choice quiz' }
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /* ================= INIT ================= */

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;

    if (this.isLoggedIn) {
      this.userName = localStorage.getItem('userName') || 'User';
      this.userEmail = localStorage.getItem('userEmail') || '';
      this.loadDocuments();
    }

    this.showWelcomeMessage();
  }

  ngOnDestroy(): void {}

  /* ================= HELPERS ================= */

  isString(value: any): boolean {
    return typeof value === 'string';
  }

  private showWelcomeMessage() {
    this.messages = [{
      role: 'assistant',
      content: 'Hello! Please upload a PDF to start.',
      timestamp: this.getTime(),
      docId: null,
      type: 'text'
    }];
  }

  /* ================= DROPDOWN ================= */

  getModeConfig(val: string) {
    return this.modeOptions.find(m => m.value === val) || this.modeOptions[0];
  }

  selectMode(val: ModeType): void {
    const changed = this.selectedMode !== val;
    this.selectedMode = val;
    this.modeDropdownOpen = false;

    if (changed && this.currentDocumentId) {
      this.onModeChange();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.mode-dropdown')) {
      this.modeDropdownOpen = false;
    }
  }

  /* ================= CHAT ================= */

  newChat(): void {
    this.currentDocumentId = null;
    this.currentConversationId = null;
    this.userInput = '';
    this.showWelcomeMessage();
    this.scrollToBottom();
  }

  deleteDocument(event: MouseEvent, docId: string): void {
    event.stopPropagation();
    if (!confirm('Delete this document and its chat?')) return;

    this.documents = this.documents.filter(d => d.document_id !== docId);
    this.messages = this.messages.filter(m => m.docId !== docId);

    if (this.currentDocumentId === docId) {
      this.currentDocumentId = null;
      this.currentConversationId = null;
      this.showWelcomeMessage();
    }

    this.loadHistory();
  }

  clearHistory(): void {
    this.documents = [];
    this.messages = [];
    this.currentDocumentId = null;
    this.currentConversationId = null;

    this.loadHistory();
    this.showWelcomeMessage();
  }

  /* ================= PDF ================= */

  async onFileSelected(event: any): Promise<void> {
    if (!this.isBrowser) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire('Error', 'Only PDF allowed', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.isLoading = true;

    try {
      let endpoint = `${this.apiBase}/guest/upload-pdf`;
      const headers: any = {};
      const token = localStorage.getItem('token');
      
      if (this.isLoggedIn && token) {
        endpoint = `${this.apiBase}/upload-pdf`;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      this.currentDocumentId = data.document_id;

      this.documents.unshift({
        document_id: data.document_id,
        file_name: file.name
      });

      this.messages.push({
        role: 'assistant',
        content: `📄 PDF <b>${file.name}</b> uploaded successfully.`,
        timestamp: this.getTime(),
        docId: data.document_id,
        type: 'text'
      });

      this.loadHistory();

    } catch (err: any) {
      alert(err.message || err);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* ================= SEND ================= */

  async sendMessage(): Promise<void> {
    if (!this.userInput.trim() || !this.currentDocumentId) return;

    const query = this.userInput.trim();

    this.messages.push({
      role: 'user',
      content: query,
      timestamp: this.getTime(),
      docId: this.currentDocumentId,
      type: 'text'
    });

    this.userInput = '';
    this.isLoading = true;

    try {
      let endpoint = `${this.apiBase}/guest/rag`;
      const headers: any = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      
      if (this.isLoggedIn && token) {
        endpoint = `${this.apiBase}/rag`;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: this.selectedMode,
          query,
          document_id: this.currentDocumentId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      this.handleResponseData(data, this.selectedMode, this.currentDocumentId, query);

    } catch (err: any) {
      alert(err.message || err);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* ================= RESPONSE ================= */

  private handleResponseData(data: any, mode: ModeType, docId: string, userQuery?: string) {

    if (mode === 'mcq') {
      this.messages.push({
        role: 'assistant',
        content: { mcqs: data.mcqs || [] },
        timestamp: this.getTime(),
        docId,
        type: 'mcq'
      });

    } else if (mode === 'flashcards') {
      this.messages.push({
        role: 'assistant',
        content: { flashcards: data.flashcards || [] },
        timestamp: this.getTime(),
        docId,
        type: 'flashcards'
      });

    } else if (mode === 'summarize') {
      this.messages.push({
        role: 'assistant',
        content: (data.overview || data.summary) ? data : 'No summary available', 
        timestamp: this.getTime(),
        docId,
        type: 'summary'
      });

    } else {
      this.messages.push({
        role: 'assistant',
        content: {
          question: userQuery,
          answer: data.answer || data
        },
        timestamp: this.getTime(),
        docId,
        type: 'qa'
      });
    }
  }

  /* ================= MCQ ================= */

  selectMcqOption(msg: any, index: number, optionKey: unknown): void {
    const key = String(optionKey);
    const question = msg.content?.mcqs?.[index];
    if (!question || question.showAnswer) return;

    question.selected = key;
    question.showAnswer = true;
  }

  /* ================= HISTORY ================= */

  loadHistory(): void {
    this.filteredDocuments = !this.searchQuery
      ? [...this.documents]
      : this.documents.filter(d =>
          d.file_name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
  }

  selectDocument(doc: any): void {
    this.currentDocumentId = doc.document_id;
    this.scrollToBottom();
  }

  /* ================= UI ================= */

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleTheme() { this.isDarkMode = !this.isDarkMode; }

  get filteredMessages() {
    return this.messages.filter(m => m.docId === this.currentDocumentId);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.myScrollContainer?.nativeElement.scrollTo({
        top: this.myScrollContainer.nativeElement.scrollHeight
      });
    }, 100);
  }

  private getTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  onModeChange(): void {
    if (!this.currentDocumentId) return;

    this.messages.push({
      role: 'assistant',
      type: 'text',
      content: `Switched to ${this.selectedMode.toUpperCase()} mode.`,
      timestamp: this.getTime(),
      docId: this.currentDocumentId
    });
  }

  /* ================= API ================= */

  private async loadDocuments(): Promise<void> {
    if (!this.isBrowser || !this.isLoggedIn) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${this.apiBase}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      this.documents = await res.json();
      this.loadHistory();

    } catch (err) {
      console.error(err);
    }
  }
}