import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Header } from '../../../shared/components/header/header';

@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './default-layout.html',
  styleUrl: './default-layout.css',
})
export class DefaultLayout {
  mobileMenuOpen = signal(false);
  
  isSidebarCollapsed = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }
}