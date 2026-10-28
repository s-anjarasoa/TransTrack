import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AreaChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-area-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './area-chart.html',
  styleUrl: './area-chart.css',
})
export class AreaChart {
  @Input() data: AreaChartPoint[] = [];
  @Input() color = '#0EA5E9'; // Cyan par défaut

  get maxValue(): number {
    if (this.data.length === 0) return 1;
    return Math.max(...this.data.map(d => d.value)) * 1.2; // Marge de 20% en haut
  }

  // Génère les coordonnées du chemin pour le SVG
  get points(): string {
    if (this.data.length === 0) return '';
    const width = 100;
    const height = 100;
    const step = width / (this.data.length - 1 || 1);

    return this.data.map((d, i) => {
      const x = i * step;
      const y = height - (d.value / this.maxValue) * height;
      return `${x},${y}`;
    }).join(' ');
  }

  // Ferme le polygone pour remplir le dessous
  get areaPoints(): string {
    if (this.data.length === 0) return '';
    return `0,100 ${this.points} 100,100`;
  }
}