import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PieChartItem {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pie-chart.html',
  styleUrl: './pie-chart.css',
})
export class PieChart {
  @Input() items: PieChartItem[] = [];

  // État pour le survol interactif
  hoveredItem = signal<PieChartItem | null>(null);

  get total(): number {
    return this.items.reduce((acc, item) => acc + item.value, 0);
  }

  getSegments() {
    const total = this.total;
    if (total === 0) return [];

    let accumulatedPercent = 0;
    return this.items.map((item) => {
      const percent = (item.value / total) * 100;
      const dashArray = `${percent} ${100 - percent}`;
      const dashOffset = -accumulatedPercent;
      accumulatedPercent += percent;

      return {
        ...item,
        percent: Math.round(percent),
        dashArray,
        dashOffset,
      };
    });
  }

  onHover(item: PieChartItem | null): void {
    this.hoveredItem.set(item);
  }
}