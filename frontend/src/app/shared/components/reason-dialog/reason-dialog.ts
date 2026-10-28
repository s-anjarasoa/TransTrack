import { Component, HostListener, Input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

/**
 * Boîte de dialogue qui demande un motif avant une action sensible
 * (ex. suspendre un agent). Le parent gère l'ouverture/fermeture.
 *
 * <app-reason-dialog
 *   title="Suspendre cet agent"
 *   message="..."
 *   confirmLabel="Suspendre"
 *   [loading]="actionLoading()"
 *   [errorMessage]="errorMessage()"
 *   (confirmed)="onConfirm($event)"
 *   (cancelled)="onCancel()" />
 */
@Component({
  selector: 'app-reason-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './reason-dialog.html',
  styleUrl: './reason-dialog.css',
})
export class ReasonDialog {
  @Input() title = 'Motif';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmer';
  @Input() placeholder = 'Saisissez le motif…';
  @Input() minLength = 5;
  @Input() maxLength = 255;
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  confirmed = output<string>();
  cancelled = output<void>();

  reason = new FormControl('', { nonNullable: true });
  touched = false;

  get trimmed(): string {
    return this.reason.value.trim();
  }

  get tooShort(): boolean {
    return this.trimmed.length < this.minLength;
  }

  confirm(): void {
    this.touched = true;
    if (this.tooShort || this.loading) return;
    this.confirmed.emit(this.trimmed);
  }

  cancel(): void {
    if (!this.loading) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel();
  }
}