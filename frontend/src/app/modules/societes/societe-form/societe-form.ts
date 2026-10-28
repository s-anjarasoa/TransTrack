import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SocietesService } from '../societes';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { AgentType } from '../../../core/models/agent.model';
import { NotificationService } from '../../../core/services/notification';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-societe-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './societe-form.html',
  styleUrl: './societe-form.css',
})
export class SocieteForm implements OnInit {
  private fb = inject(FormBuilder);
  private societesService = inject(SocietesService);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  loading = signal(false);
  checking = signal(true);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  societeId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{8,}$/)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required]],
    nif: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    numState: ['', [Validators.required,Validators.pattern(/^[0-9\s]{10,20}$/)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.societeId.set(Number(id));
      this.checkEditPermission(Number(id));
    } else {
      this.agentProfileService.ensureLoaded().subscribe((agent) => {
        this.checking.set(false);
        if (agent?.societeId) {
          this.router.navigate(['/societes', agent.societeId]);
        }
      });
    }
  }

  private checkEditPermission(id: number): void {
    if (this.authService.hasRole('ADMIN')) {
      this.loadSociete(id);
      return;
    }

    this.agentProfileService.ensureLoaded().subscribe((agent) => {
      const allowed = agent?.type === AgentType.DIRECTEUR && agent?.societeId === id;
      if (allowed) {
        this.loadSociete(id);
      } else {
        this.router.navigate(['/unauthorized']);
      }
    });
  }

  private loadSociete(id: number): void {
    this.checking.set(true);
    this.societesService.findOne(id).subscribe({
      next: (societe) => {
        this.form.patchValue({
          name: societe.name,
          phone: societe.phone,
          email: societe.email,
          address: societe.address,
          nif: societe.nif,
          numState: societe.numState,
        });
        this.form.get('nif')?.disable();
        this.form.get('numState')?.disable();
        this.checking.set(false);
      },
      error: () => {
        this.checking.set(false);
        const msg = 'Impossible de charger la société';
        this.errorMessage.set(msg);
        this.notification.error(msg);
      },
    });
  }

  cancel(): void {
    if (this.isEditMode() && this.societeId()) {
      this.router.navigate(['/societes', this.societeId()]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

    submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const payload = this.form.getRawValue();

    if (this.isEditMode() && this.societeId()) {
      this.societesService.update(this.societeId()!, payload).subscribe({
        next: (societe) => {
          this.loading.set(false);
          this.notification.success('Société mise à jour avec succès');
          this.router.navigate(['/societes', societe.id]);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message ?? 'Erreur lors de la mise à jour.');
          this.notification.error(this.errorMessage()!);
        },
      });
    } else {
      this.societesService.create(payload).subscribe({
        next: (societe) => {
          this.loading.set(false);
          this.agentProfileService.reset();
          // ✅ Message plus clair sur l'étape suivante
          this.notification.success('Société créée ! En attente de validation par l\'administrateur.');
          this.router.navigate(['/societes', societe.id]); // Va sur la page détail
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
          this.notification.error(this.errorMessage()!);
        },
      });
    }
  }
}