import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VideoService {

  constructor(private http: HttpClient) {}

  analyze(url: string) {
    return this.http.post<any>('http://localhost:5000/api/video/analyze', { url });
  }
}