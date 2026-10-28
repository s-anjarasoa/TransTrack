import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InboxService } from '../../../core/services/inbox';
import { AppNotification, NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit, OnDestroy {
  inbox = inject(InboxService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  open = signal(false);

  private labels: Record<NotificationType, string> = {
    SYSTEME: 'Système', ABONNEMENT: 'Abonnement', PAIEMENT: 'Paiement', RESERVATION: 'Réservation',
    VOYAGE: 'Voyage', BILLET: 'Billet', VALIDATION_AGENT: 'Agent', VALIDATION_SOCIETE: 'Société',
    MESSAGE: 'Message', ALERTE: 'Alerte',
  };

  ngOnInit(): void {
    this.inbox.startPolling();
  }

  ngOnDestroy(): void {
    this.inbox.stopPolling();
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.inbox.loadRecent();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  onItemClick(n: AppNotification): void {
    this.inbox.markAsRead(n);
    const url = n.metadata?.actionUrl;
    if (url && url.startsWith('/')) {
      this.open.set(false);
      this.router.navigateByUrl(url);
    }
  }

  typeLabel(type: NotificationType): string {
    return this.labels[type] ?? type;
  }

  isUrgent(n: AppNotification): boolean {
    return n.priorite === 'HAUTE' || n.priorite === 'URGENTE';
  }

  timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'à l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}