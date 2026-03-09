import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ChatbotComponent implements OnInit {

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
  selectedMode: 'qa' | 'summary' | 'flashcards' | 'mcq' = 'qa';
  searchQuery = '';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return; // ⛔ stop SSR here

    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = localStorage.getItem('userName') || 'User';
    this.userEmail = localStorage.getItem('userEmail') || '';

    this.messages.push({
      role: 'assistant',
      content: 'Hello! Please upload a PDF to start or select an existing document.',
      timestamp: this.getTime(),
      docId: null,
      type: 'text'
    });

    this.loadDocuments();
  }

  newChat(): void {
    this.currentDocumentId = null;
    this.userInput = '';
    this.scrollToBottom();
  }

  deleteDocument(event: MouseEvent, docId: string): void {
    event.stopPropagation();

    if (!confirm('Delete this document and its chat?')) return;

    this.documents = this.documents.filter(d => d.document_id !== docId);
    this.messages = this.messages.filter(m => m.docId !== docId);

    if (this.currentDocumentId === docId) {
      this.currentDocumentId = null;
    }

    this.loadHistory();
  }

  /* =========================
     PDF UPLOAD
     ========================= */
  async onFileSelected(event: any): Promise<void> {
    if (!this.isBrowser) return;

    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.isLoading = true;

    try {
      const res = await fetch(`${this.apiBase}/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      this.currentDocumentId = data.document_id;
      this.currentConversationId = data.conversation_id ?? null;

      this.documents.unshift({
        document_id: data.document_id,
        file_name: file.name,
        uploaded_at: new Date().toISOString()
      });

      this.messages.push({
        role: 'assistant',
        content: `📄 PDF <b>${file.name}</b> uploaded successfully.`,
        timestamp: this.getTime(),
        docId: data.document_id,
        type: 'text'
      });

      this.loadHistory();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
      else alert(err);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* =========================
     SEND MESSAGE
     ========================= */
  async sendMessage(): Promise<void> {
    if (!this.isBrowser || !this.userInput.trim() || !this.currentDocumentId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const question = this.userInput;
    const docId = this.currentDocumentId;

    this.messages.push({
      role: 'user',
      content: question,
      timestamp: this.getTime(),
      docId,
      type: 'text'
    });

    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    try {
      const res = await fetch(`${this.apiBase}/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          task: this.selectedMode,
          query: question,
          source: { type: 'pdf', id: docId },
          options: {}
        })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      this.currentConversationId = data.conversation_id ?? this.currentConversationId;

      // ✅ Handle QA vs other tasks
      if (this.selectedMode === 'qa') {
        const backendMessages = (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: this.getTime(),
          docId,
          type: m.mode
        }));
        this.messages = this.messages.filter(m => m.docId !== docId).concat(backendMessages);
      } else if (this.selectedMode === 'summary') {
        this.messages.push({
          role: 'assistant',
          content: data.summary || data,
          timestamp: this.getTime(),
          docId,
          type: 'summary'
        });
      } else if (this.selectedMode === 'flashcards') {
        this.messages.push({
          role: 'assistant',
          content: { flashcards: data.flashcards || [] },
          timestamp: this.getTime(),
          docId,
          type: 'flashcards'
        });
      } else if (this.selectedMode === 'mcq') {
        this.messages.push({
          role: 'assistant',
          content: { mcqs: data.mcqs || [] },
          timestamp: this.getTime(),
          docId,
          type: 'mcq'
        });
      }

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) alert('Error fetching response: ' + err.message);
      else alert('Error fetching response: ' + err);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* =========================
     DATA LOADERS
     ========================= */

  private async loadDocuments(): Promise<void> {
    if (!this.isBrowser) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${this.apiBase}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return;

    this.documents = await res.json();
    this.loadHistory();
  }

  private async loadConversationForDocument(documentId: string): Promise<void> {
    if (!this.isBrowser) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const listRes = await fetch(
      `${this.apiBase}/conversations?document_id=${documentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) return;

    const convos = await listRes.json();
    if (!convos.length) return;

    const convoRes = await fetch(
      `${this.apiBase}/conversations/${convos[0].conversation_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!convoRes.ok) return;

    const convo = await convoRes.json();

    this.messages = this.messages
      .filter(m => m.docId !== documentId)
      .concat(
        convo.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: this.getTime(),
          docId: documentId,
          type: m.mode
        }))
      );
  }

  loadHistory() {
    this.filteredDocuments = !this.searchQuery
      ? [...this.documents]
      : this.documents.filter(d =>
          d.file_name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.myScrollContainer?.nativeElement.scrollTo({
        top: this.myScrollContainer.nativeElement.scrollHeight
      });
    }, 100);
  }

  private getTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* =========================
     TEMPLATE-REQUIRED METHODS
     ========================= */

  get filteredMessages() {
    return this.messages.filter(m => m.docId === this.currentDocumentId);
  }

  selectDocument(doc: any) {
    this.currentDocumentId = doc.document_id;
    this.currentConversationId = null;
    this.loadConversationForDocument(doc.document_id);
    this.scrollToBottom();
  }

  clearHistory() {
    this.documents = [];
    this.filteredDocuments = [];
    this.messages = [];
    this.currentDocumentId = null;
    this.currentConversationId = null;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
  }

  selectMcqOption(msg: any, index: number, optionKey: string): void {
    const question = msg.content?.mcqs?.[index];
    if (!question || question.showAnswer) return;

    question.selected = optionKey;
    question.showAnswer = true;
  }
}
