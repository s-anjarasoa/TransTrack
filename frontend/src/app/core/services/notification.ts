import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private open(message: string, kind: ToastKind, duration: number, title?: string): void {
    if (!this.isBrowser) return; // rien à afficher pendant le rendu serveur (SSR)

    this.snackBar.open(title ? `${title} : ${message}` : message, 'Fermer', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['toast', `toast-${kind}`],
    });
  }

  success(message: string, title?: string): void { this.open(message, 'success', 3500, title); }
  error(message: string, title?: string): void { this.open(message, 'error', 6000, title); }
  warning(message: string, title?: string): void { this.open(message, 'warning', 5000, title); }
  info(message: string, title?: string): void { this.open(message, 'info', 4000, title); }
}