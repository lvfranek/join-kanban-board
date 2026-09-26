import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface UserResponse {
    user_id: number;
    email: string;
    full_name: string;
}

export interface AuthResponse extends UserResponse {
    token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrl}/auth`;

    login(email: string, password: string): Promise<AuthResponse> {
        return firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/login/`, { email, password }),
        );
    }

    register(
        fullName: string,
        email: string,
        password: string,
        repeatedPassword: string,
    ): Promise<AuthResponse> {
        return firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/registration/`, {
                full_name: fullName,
                email,
                password,
                repeated_password: repeatedPassword,
            }),
        );
    }

    async logout(): Promise<void> {
        if (this.auth.getToken()) {
            try {
                await firstValueFrom(this.http.post(`${this.baseUrl}/logout/`, {}));
            } catch {
                // Token already invalid or server unreachable: log out locally anyway.
            }
        }
        this.auth.logout();
    }

    me(): Promise<UserResponse> {
        return firstValueFrom(this.http.get<UserResponse>(`${this.baseUrl}/me/`));
    }

    async restoreSession(): Promise<boolean> {
        if (!this.auth.getToken()) {
            return false;
        }

        try {
            const user = await this.me();
            this.auth.setAuthenticated(true);
            this.auth.setCurrentUser({
                id: String(user.user_id),
                email: user.email,
                name: user.full_name,
                phone: '',
            });
            return true;
        } catch {
            this.auth.clearToken();
            this.auth.setAuthenticated(false);
            return false;
        }
    }
}
