import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialog, ConfirmData } from '../../shared/components/confirm-dialog/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);

  ask(data: ConfirmData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialog, { data, width: '420px', autoFocus: false })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}