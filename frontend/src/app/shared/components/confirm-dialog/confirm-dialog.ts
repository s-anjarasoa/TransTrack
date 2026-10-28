import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Annuler</button>
      <button mat-flat-button [mat-dialog-close]="true" [class.confirm-danger]="data.danger">
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-danger {
      --mdc-filled-button-container-color: #DC2626;
      --mat-button-filled-container-color: #DC2626;
      --mdc-filled-button-label-text-color: #fff;
      --mat-button-filled-label-text-color: #fff;
    }
  `],
})
export class ConfirmDialog {
  data = inject<ConfirmData>(MAT_DIALOG_DATA);
}