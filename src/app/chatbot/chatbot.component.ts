import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: any;
  timestamp: string;
  docId: string | null;
  type: 'text' | 'qa' | 'mcq' | 'summary' | 'card';
}

interface UploadedDocument {
  document_id: string;
  file_name: string;
}

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
  searchQuery = '';
  selectedMode = 'qa';

  formattedResponse: any = null;

  ngOnInit(): void {
    this.loadHistory();
    this.messages.push({
      role: 'assistant',
      content: 'Hello! Please upload a PDF to start a session.',
      timestamp: this.getTime(),
      docId: null,
      type: 'text'
    });
  }

  clearHistory() {
    if (confirm('Are you sure you want to clear all uploaded files?')) {
      this.documents = [];
      this.filteredDocuments = [];
      this.messages = [];
      this.currentDocumentId = null;
    }
  }

  get filteredMessages() {
    return this.messages.filter(m => m.docId === this.currentDocumentId);
  }

  selectMcqOption(questionObj: any, selectedKey: any) {
    if (questionObj.userSelected) return;
    questionObj.userSelected = selectedKey;
    questionObj.isCorrect = selectedKey === questionObj.correct;
  }

  /* ================== MAIN CHANGE HERE ================== */
  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const now = this.getTime();
    const currentDoc = this.currentDocumentId;
    const currentMode = this.selectedMode;

    this.messages.push({
      role: 'user',
      content: this.userInput,
      timestamp: now,
      docId: currentDoc,
      type: 'text'
    });

    const tempInput = this.userInput;
    this.userInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    setTimeout(() => {

      let backendResponse: any;

      switch (currentMode) {

        case 'mcq':
          backendResponse = {
            task: 'mcq',
            mcqs: [
              {
                question: 'What is Angular?',
                options: { A: 'Database', B: 'Framework', C: 'Browser', D: 'OS' },
                correct: 'B',
                explanation: 'Angular is a frontend framework.'
              }
            ]
          };
          break;

        case 'card':
          backendResponse = {
            task: 'flashcards',
            flashcards: [
              { front: 'HTML', back: 'Structure' },
              { front: 'CSS', back: 'Styling' },
              { front: 'JS', back: 'Logic' }
            ]
          };
          break;

        case 'summary':
          backendResponse = {
            task: 'summarize',
            key_points: [
              'Component based',
              'Uses TypeScript',
              'Two-way binding'
            ],
            overview: 'Angular is a modern frontend framework.'
          };
          break;

        default:
          backendResponse = {
            task: 'qa',
            answer: `Sample answer for "${tempInput}".`
          };
      }

      const formatted = this.applyFormatting(backendResponse);

      this.messages.push({
        role: 'assistant',
        content: formatted,
        timestamp: this.getTime(),
        docId: currentDoc,
        type: currentMode
      });

      this.isLoading = false;
      this.scrollToBottom();
    }, 800);
  }
  /* ================== END CHANGE ================== */

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;

    setTimeout(() => {
      const mockId = Math.random().toString(36).substring(2, 9);
      this.documents.unshift({ document_id: mockId, file_name: file.name });
      this.loadHistory();
      this.currentDocumentId = mockId;

      this.messages.push({
        role: 'assistant',
        content: `Processed <b>${file.name}</b>.`,
        timestamp: this.getTime(),
        docId: mockId,
        type: 'text'
      });

      this.isLoading = false;
      this.scrollToBottom();
    }, 700);
  }

  selectDocument(doc: any) {
    this.currentDocumentId = doc.document_id;
    this.scrollToBottom();
  }

  newChat() {
    this.currentDocumentId = null;
    this.scrollToBottom();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  toggleTheme() { this.isDarkMode = !this.isDarkMode; }

  deleteDocument(event: MouseEvent, docId: string): void {
    event.stopPropagation();
    if (confirm('Delete this chat?')) {
      this.documents = this.documents.filter(d => d.document_id !== docId);
      this.messages = this.messages.filter(m => m.docId !== docId);
      if (this.currentDocumentId === docId) this.currentDocumentId = null;
      this.loadHistory();
    }
  }

  loadHistory() {
    this.filteredDocuments = !this.searchQuery.trim()
      ? [...this.documents]
      : this.documents.filter(doc =>
          doc.file_name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
  }

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

  /* FORMATTERS */

  private formatBackendResponse(raw: any) {
    if (!raw || !raw.task) return raw;
    switch (raw.task) {
      case 'mcq': return this.formatMCQ(raw);
      case 'flashcards': return this.formatFlashcards(raw);
      case 'summarize': return this.formatSummary(raw);
      default: return this.formatQA(raw);
    }
  }

  private formatQA(data: any) {
    return { type: 'qa', answer: data.answer };
  }

  private formatSummary(data: any) {
    return { key_points: data.key_points, overview: data.overview };
  }

  private formatFlashcards(data: any) {
    return { flashcards: data.flashcards };
  }

  private formatMCQ(data: any) {
    return { mcqs: data.mcqs };
  }

  private applyFormatting(response: any) {
    const formatted = this.formatBackendResponse(response);
    this.formattedResponse = formatted;
    return formatted;
  }
}
