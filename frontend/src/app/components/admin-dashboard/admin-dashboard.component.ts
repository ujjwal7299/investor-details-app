import { Component, inject, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { InvestorRecord } from '../../models/admin.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  private readonly adminService = inject(AdminService);
  readonly back = output<void>();
  readonly loggedOut = output<void>();
  investors: InvestorRecord[] = [];
  isLoading = true;
  errorMessage = '';
  expandedInvestorId: string | null = null;

  constructor() { this.loadInvestors(); }

  loadInvestors(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.investors().subscribe({
      next: (response) => { this.investors = response.data; this.isLoading = false; },
      error: (error: { message?: string }) => { this.errorMessage = error.message ?? 'Unable to load investor records.'; this.isLoading = false; }
    });
  }

  logout(): void {
    this.adminService.logout().subscribe({ complete: () => this.finishLogout(), error: () => this.finishLogout() });
  }

  currentValue(investor: InvestorRecord, field: keyof InvestorRecord): string {
    const updatedValue = investor.updatedDetails?.[field];
    const originalValue = investor[field];
    return String(updatedValue ?? originalValue ?? '');
  }

  hasPastDetails(investor: InvestorRecord): boolean {
    return !!investor.updatedDetails && Object.keys(investor.updatedDetails).length > 0;
  }

  togglePastDetails(investor: InvestorRecord): void {
    this.expandedInvestorId = this.expandedInvestorId === investor.id ? null : investor.id;
  }

  removeInvestor(investor: InvestorRecord): void {
    if (!window.confirm(`Remove ${investor.name} from the database?`)) return;
    this.adminService.removeInvestor(investor.id).subscribe({
      next: () => {
        this.investors = this.investors.filter((item) => item.id !== investor.id);
        this.expandedInvestorId = null;
      },
      error: (error: { message?: string }) => { this.errorMessage = error.message ?? 'Unable to remove investor.'; }
    });
  }

  private finishLogout(): void { this.adminService.clearToken(); this.loggedOut.emit(); }
}
