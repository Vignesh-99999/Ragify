import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private API_URL = 'http://localhost:5000/api/admin';

  constructor(private http: HttpClient) {}

  getResearcherCount(): Observable<any> {
    return this.http.get(`${this.API_URL}/researchers/count`);
  }


  getResearchers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/researchers`);
    }
}