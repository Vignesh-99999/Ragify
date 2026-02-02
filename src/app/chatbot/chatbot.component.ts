import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

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

  messages: any[] = [];
  documents: any[] = [];
  filteredDocuments: any[] = [];
  currentDocumentId: string | null = null;

  userInput = '';
  selectedMode: 'qa' | 'summary' | 'flashcards' | 'mcq' = 'qa';
  searchQuery = '';

  ngOnInit(): void {
    this.messages.push({
      role: 'assistant',
      content: 'Hello! Please upload a PDF to start.',
      timestamp: this.getTime(),
      docId: null,
      type: 'text'
    });
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
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.isLoading = true;

    try {
      const res = await fetch('http://localhost:5001/guest/upload-pdf', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${text}`);
      }

      const data = await res.json();

      if (!data.document_id) throw new Error('No document_id returned from backend');

      this.currentDocumentId = data.document_id;

      this.documents.unshift({
        document_id: data.document_id,
        file_name: file.name
      });
      this.loadHistory();

      this.messages.push({
        role: 'assistant',
        content: `PDF <b>${file.name}</b> uploaded successfully.`,
        timestamp: this.getTime(),
        docId: data.document_id,
        type: 'text'
      });
    } catch (err) {
      console.error(err);
      alert(`PDF upload failed: ${err}`);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* =========================
     SEND MESSAGE
     ========================= */
  async sendMessage(): Promise<void> {
    if (!this.userInput.trim()) return;
    if (!this.currentDocumentId) {
      alert('Please upload a PDF first.');
      return;
    }

    const question = this.userInput;
    const mode = this.selectedMode;
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
      const res = await fetch('http://localhost:5001/guest/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: mode,
          query: question,
          document_id: docId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`RAG request failed: ${text}`);
      }

      const data = await res.json();

      this.messages.push({
        role: 'assistant',
        content: data.answer || data,
        timestamp: this.getTime(),
        docId,
        type: mode
      });
    } catch (err) {
      console.error(err);
      alert(`Error fetching response: ${err}`);
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /* =========================
     UI HELPERS
     ========================= */
  get filteredMessages() {
    return this.messages.filter(m => m.docId === this.currentDocumentId);
  }

  selectDocument(doc: any) {
    this.currentDocumentId = doc.document_id;
    this.scrollToBottom();
  }

  clearHistory() {
    this.documents = [];
    this.filteredDocuments = [];
    this.messages = [];
    this.currentDocumentId = null;
  }

  loadHistory() {
    this.filteredDocuments = !this.searchQuery.trim()
      ? [...this.documents]
      : this.documents.filter(d =>
          d.file_name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleTheme() { this.isDarkMode = !this.isDarkMode; }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop =
          this.myScrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private getTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
