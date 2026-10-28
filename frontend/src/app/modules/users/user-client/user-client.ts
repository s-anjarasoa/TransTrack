import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-client',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-client.html',
  styleUrl: './user-client.css'
})
export class UserClient {
  private fb = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Output() formSubmit = new EventEmitter<any>();

  // DTO: CreateClientDto (address, CIN, phone, passport)
  form = this.fb.nonNullable.group({
    address: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    CIN: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
    phone: ['', [Validators.required, Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]],
    passport: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.formSubmit.emit(this.form.getRawValue());
  }
}