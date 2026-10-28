import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon'; // ✅ Ajouté
import { ClientsService } from '../clients';
import { Client } from '../../../core/models/client.model';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [RouterLink, MatIconModule], // ✅ Ajouté
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.css',
})
export class ClientsList implements OnInit {
  private clientsService = inject(ClientsService);
  private notification = inject(NotificationService);

  loading = signal(true);
  allClients = signal<Client[]>([]);
  total = signal(0);
  searchTerm = signal('');

  // ✅ KPI Stats (Basés sur les données disponibles)
  stats = computed(() => {
    const list = this.allClients();
    return {
      total: list.length,
      avecCin: list.filter(c => !!c.CIN).length,
      avecPassport: list.filter(c => !!c.passport).length,
      avecAdresse: list.filter(c => !!c.address).length,
    };
  });

  // ✅ Filtrage par recherche
  clients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.allClients();

    if (!term) return list;

    return list.filter(c => {
      const haystack = `${this.clientName(c)} ${c.user?.email} ${c.CIN}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.clientsService.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.allClients.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  clientName(client: Client): string {
    const u = client.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—';
  }

  getInitials(client: Client): string {
    const u = client.user;
    if (!u) return '?';
    if (u.firstName && u.lastName) {
      return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    }
    return (u.email ? u.email[0] : '?').toUpperCase();
  }

  deleteClient(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      this.clientsService.remove(id).subscribe({
        next: () => {
          this.allClients.update(list => list.filter(c => c.id !== id));
          this.total.update(t => Math.max(0, t - 1));
          this.notification.success('Client supprimé avec succès');
        },
        error: (err) => this.notification.error(err.error?.message ?? 'Erreur lors de la suppression')
      });
    }
  }
}