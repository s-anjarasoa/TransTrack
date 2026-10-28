import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api';
import { NotificationService } from './notification';
import { AppNotification } from '../models/notification.model';

const POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class InboxService {
  private api = inject(ApiService);
  private toast = inject(NotificationService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  unreadCount = signal(0);
  items = signal<AppNotification[]>([]);
  loadingItems = signal(false);

  private lastCount: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  startPolling(): void {
    if (!this.isBrowser || this.timer) return;
    this.refreshCount();
    this.timer = setInterval(() => {
      if (!document.hidden) this.refreshCount(); // inutile d'interroger si l'onglet est en arrière-plan
    }, POLL_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.lastCount = null;
    this.unreadCount.set(0);
    this.items.set([]);
  }

  refreshCount(): void {
    this.api.get<{ count: number }>('/notifications/me/unread-count').subscribe({
      next: ({ count }) => {
        if (this.lastCount !== null && count > this.lastCount) {
          this.toast.info(`${count - this.lastCount} nouvelle(s) notification(s)`);
        }
        this.setCount(count);
      },
      error: () => {}, // le polling ne doit jamais gêner l'utilisateur
    });
  }

  loadRecent(): void {
    this.loadingItems.set(true);
    this.api.get<{ data: AppNotification[] }>('/notifications/me', { limit: 15 }).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loadingItems.set(false);
      },
      error: () => this.loadingItems.set(false),
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.isLue) return;
    this.items.update((list) => list.map((n) => (n.id === notification.id ? { ...n, isLue: true } : n)));
    this.setCount(Math.max(0, this.unreadCount() - 1));
    this.api.patch(`/notifications/${notification.id}/read`, {}).subscribe({ error: () => this.resync() });
  }

  markAllAsRead(): void {
    this.items.update((list) => list.map((n) => ({ ...n, isLue: true })));
    this.setCount(0);
    this.api.patch('/notifications/me/read-all', {}).subscribe({ error: () => this.resync() });
  }

  private setCount(count: number): void {
    this.lastCount = count;
    this.unreadCount.set(count);
  }

  private resync(): void {
    this.refreshCount();
    this.loadRecent();
  }
}