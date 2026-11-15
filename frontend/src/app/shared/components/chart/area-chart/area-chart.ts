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
  @Input() color = '#0EA5E9';

  get maxValue(): number {
    if (!this.data || this.data.length === 0) return 1;
    const max = Math.max(...this.data.map(d => d.value));
    // ✅ Marge de 40% en haut pour bien aérer le graphique
    return max > 0 ? max * 1.4 : 1; 
  }

  get points(): string {
    if (!this.data || this.data.length === 0) return '';
    
    const width = 100;
    const height = 100;
    const step = width / (this.data.length - 1 || 1);

    return this.data.map((d, i) => {
      const x = i * step;
      // ✅ On s'assure que le point reste bien dans le cadre (max 95 pour ne pas toucher le bord)
      const y = Math.max(5, Math.min(95, height - (d.value / this.maxValue) * height));
      return `${x},${y}`;
    }).join(' ');
  }

  get areaPoints(): string {
    if (!this.data || this.data.length === 0) return '';
    return `0,100 ${this.points} 100,100`;
  }
}