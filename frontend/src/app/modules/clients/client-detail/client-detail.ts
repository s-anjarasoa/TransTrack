import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ClientsService } from '../clients';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.css',
})
export class ClientDetail {
  private route = inject(ActivatedRoute);
  private clientsService = inject(ClientsService);

  // Conversion propre des Params -> Appels API via Signals
  private clientState$ = this.route.paramMap.pipe(
    map(params => Number(params.get('id'))),
    switchMap(id => this.clientsService.findOne(id).pipe(
      map(data => ({ loading: false, error: false, data })),
      catchError(() => of({ loading: false, error: true, data: null }))
    ))
  );

  state = toSignal(this.clientState$, { 
    initialValue: { loading: true, error: false, data: null } 
  });

  clientName = computed(() => {
    const u = this.state().data?.user;
    if (!u) return '—';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
  });
}