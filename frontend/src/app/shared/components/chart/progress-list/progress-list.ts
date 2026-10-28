import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressItem {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

@Component({
  selector: 'app-progress-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-list.html',
  styleUrl: './progress-list.css',
})
export class ProgressList {
  @Input() items: ProgressItem[] = [];

  get maxValue(): number {
    if (this.items.length === 0) return 1;
    const max = Math.max(...this.items.map(i => i.max ?? i.value));
    return max > 0 ? max : 1;
  }

  getPercentage(value: number, max?: number): number {
    const m = max ?? this.maxValue;
    return Math.round((value / m) * 100);
  }
}