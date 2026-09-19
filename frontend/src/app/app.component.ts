import { Component, inject } from '@angular/core';
import { UserFormComponent } from './components/user-form/user-form.component';
import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminService } from './services/admin.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UserFormComponent, AdminLoginComponent, AdminDashboardComponent],
  template: `
    @if (view !== 'form') { <nav class="app-nav"><span class="app-name">Investor Desk Admin</span></nav> }
    <main>
      @if (view === 'form') { <app-user-form /> }
      @else if (view === 'login') { <app-admin-login (loggedIn)="showDashboard()" (back)="showForm()" /> }
      @else { <app-admin-dashboard (back)="showForm()" (loggedOut)="showLogin()" /> }
    </main>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly adminService = inject(AdminService);
  view: 'form' | 'login' | 'dashboard' = this.getInitialView();

  showDashboard(): void { this.navigate('/uadmin'); this.view = 'dashboard'; }
  showLogin(): void { this.navigate('/uadmin'); this.view = 'login'; }
  showForm(): void { this.navigate('/'); this.view = 'form'; }

  private getInitialView(): 'form' | 'login' | 'dashboard' {
    const isAdminPath = window.location.pathname === '/uadmin';
    if (!isAdminPath) return 'form';
    return this.adminService.isLoggedIn() ? 'dashboard' : 'login';
  }

  private navigate(path: string): void {
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }
}
