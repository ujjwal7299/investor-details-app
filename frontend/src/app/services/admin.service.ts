import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminLoginResponse, InvestorRecord } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;
  private readonly tokenKey = 'fieldnote_admin_token';

  login(userId: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.baseUrl}/login`, { userId, password });
  }

  setToken(token: string): void { sessionStorage.setItem(this.tokenKey, token); }
  clearToken(): void { sessionStorage.removeItem(this.tokenKey); }
  isLoggedIn(): boolean { return !!sessionStorage.getItem(this.tokenKey); }

  investors(): Observable<{ success: boolean; data: InvestorRecord[] }> {
    return this.http.get<{ success: boolean; data: InvestorRecord[] }>(`${this.baseUrl}/investors`, { headers: this.headers() });
  }

  logout(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/logout`, {}, { headers: this.headers() });
  }

  removeInvestor(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/investors/${id}`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem(this.tokenKey) ?? ''}` });
  }
}
