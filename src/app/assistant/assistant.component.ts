import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.css']
})
export class AssistantComponent implements OnInit {

  isLoggedIn = false;
  userName = '';
  userEmail = '';

  mode: 'rewrite' | 'brainstorm' | 'summarize' = 'rewrite';
  inputText = '';
  outputText = '';
  loading = false;
  error = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = localStorage.getItem('userName') || 'User';
    this.userEmail = localStorage.getItem('userEmail') || '';
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goChatbot(): void {
    this.router.navigate(['/chatbot']);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    this.router.navigate(['/login']);
  }

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
      const res = await fetch('http://localhost:5001/research-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: this.mode,
          input: trimmed
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Assistant request failed');
      }

      const data = await res.json();
      this.outputText = data.result || '';
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.error = err.message;
      } else {
        this.error = String(err);
      }
    } finally {
      this.loading = false;
    }
  }
}

