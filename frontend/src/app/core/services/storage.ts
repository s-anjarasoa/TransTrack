import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TOKEN_KEY = 'transtrack_token';
const USER_KEY = 'transtrack_user';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  removeToken(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  setUser(user: unknown): void {
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  getUser<T>(): T | null {
    if (this.isBrowser) {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    return null;
  }

  removeUser(): void {
    if (this.isBrowser) {
      localStorage.removeItem(USER_KEY);
    }
  }

  clear(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  isLoggedIn(): boolean {
    if (this.isBrowser) {
      return !!this.getToken();
    }
    return false;
  }
}