import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-code.html',
  styleUrl: './user-code.css'
})
export class UserCode {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() modalClosed = new EventEmitter<void>();

  code = signal('');

  submitCode(): void {
    if (this.code().trim()) {
      this.codeSubmitted.emit(this.code().trim());
    }
  }

  close(): void {
    this.modalClosed.emit();
  }
}