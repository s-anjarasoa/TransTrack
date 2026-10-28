import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Bagage, BagageType } from '../../../core/models/bagage.model';
import { BagagesService } from '../bagages';

@Component({
  selector: 'app-bagages-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './bagages-list.html',
  styleUrl: './bagages-list.css',
})
export class BagagesList implements OnInit {
  private bagagesService = inject(BagagesService);

  readonly BagageType = BagageType;
  loading = signal(true);
  bagages = signal<Bagage[]>([]);

  ngOnInit(): void {
    this.bagagesService.findAll().subscribe({
      next: (res: any) => { 
        this.bagages.set(res.data || res); 
        this.loading.set(false); 
      },
      error: () => this.loading.set(false)
    });
  }

  getTypeLabel(type: BagageType): string {
    const labels = { 
      [BagageType.MAIN]: 'Bagage à main', 
      [BagageType.CABINE]: 'Cabine', 
      [BagageType.SOUTE]: 'Soute', 
      [BagageType.SPECIAL]: 'Spécial' 
    };
    return labels[type] || type;
  }

  // ✅ Nouvelle méthode pour les icônes
  getTypeIcon(type: BagageType): string {
    const icons = {
      [BagageType.MAIN]: 'backpack',
      [BagageType.CABINE]: 'work_outline',
      [BagageType.SOUTE]: 'work',
      [BagageType.SPECIAL]: 'star_outline'
    };
    return icons[type] || 'luggage';
  }
}