import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  private roles: string[] = [];
  private sub: Subscription | null = null;
  private hasView = false;

  @Input() set appHasRole(roles: string[]) {
    this.roles = roles;
    this.updateView();
  }

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateView(): void {
    const allowed = this.roles.length === 0 || this.authService.hasAnyRole(this.roles);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}