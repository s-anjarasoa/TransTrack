import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private _isLoading = signal(false);
  private _message = signal<string | null>(null);
  private activeRequests = 0;

  get isLoading() {
    return this._isLoading.asReadonly();
  }

  get message() {
    return this._message.asReadonly();
  }

  show(message?: string): void {
    this.activeRequests++;
    this._message.set(message ?? null);
    this._isLoading.set(true);
  }

  hide(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this._isLoading.set(false);
      this._message.set(null);
    }
  }

  reset(): void {
    this.activeRequests = 0;
    this._isLoading.set(false);
    this._message.set(null);
  }
}