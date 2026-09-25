import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface AuthResponse {
    token: string;
    user_id: number;
    email: string;
    full_name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/auth`;

    login(email: string, password: string): Promise<AuthResponse> {
        return firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/login/`, { email, password }),
        );
    }
}
