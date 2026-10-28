// src/app/shared/components/bar-chart/bar-chart.ts
import { Component, Input } from '@angular/core';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
})
export class BarChart {
  @Input() items: BarChartItem[] = [];
  @Input() defaultColor = '#00BCD4';

  get maxValue(): number {
    return Math.max(1, ...this.items.map((i) => i.value));
  }

  barHeight(value: number): number {
    return Math.round((value / this.maxValue) * 100);
  }
}