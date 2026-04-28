import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private baseUrl = 'http://localhost:5000/api/auth'; // keep your backend URL

  constructor(private http: HttpClient) { }

  /**
   * Fetch the currently logged-in user's profile.
   */
  getProfile(): Observable<User> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<User>(`${this.baseUrl}/me`, { headers });
  }

  /**
   * Update the user's profile.
   * @param data - object containing updated name, email, mobile, password
   */
  updateProfile(data: any): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.baseUrl}/update`, data, { headers });
  }
}