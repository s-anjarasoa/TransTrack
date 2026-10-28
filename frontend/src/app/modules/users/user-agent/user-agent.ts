import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-agent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-agent.html',
  styleUrl: './user-agent.css'
})
export class UserAgent {
  private fb = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Output() formSubmit = new EventEmitter<any>();

  // Corresponds to RegisterAgentDto
  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    address: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(255)]],
    CIN: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
    phone: ['', [Validators.required, Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]],
    type: ['RECEPTIONNISTE', [Validators.required]] // Enum AgentType
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.formSubmit.emit(this.form.getRawValue());
  }
}