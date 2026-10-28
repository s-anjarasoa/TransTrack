import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Header } from '../../../shared/components/header/header';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  mobileMenuOpen = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}