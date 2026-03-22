import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../core/services/storage.service';
import { ReportProcessorService } from '../../core/services/report-processor.service';
import { REPORT_MONTHS } from '../../core/models/relatorio.model';
import { RetroButtonComponent } from '../../shared/components/retro-button/retro-button.component';

@Component({
  selector: 'app-history',
  imports: [CommonModule, FormsModule, RetroButtonComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent {
  private readonly storageService = inject(StorageService);
  private readonly reportProcessorService = inject(ReportProcessorService);

  readonly months = REPORT_MONTHS;
  readonly historyVersion = signal(0);
  readonly historyEntries = computed(() => {
    this.historyVersion();
    return this.storageService.listHistory();
  });
  readonly selectedYear = signal<number | null>(this.historyEntries()[0]?.year ?? null);
  readonly selectedPeriod = signal(0);

  readonly selectedReport = computed(() => {
    const year = this.selectedYear();
    return year === null ? {} : this.storageService.load(year);
  });
  readonly selectedHistoryEntry = computed(
    () => this.historyEntries().find((entry) => entry.year === this.selectedYear()) ?? null,
  );
  readonly allRows = computed(() => this.reportProcessorService.buildRows(this.selectedReport()));
  readonly visibleRows = computed(() => {
    const period = this.selectedPeriod();

    if (period === 0) {
      return this.allRows();
    }

    return this.allRows().filter((row) => row.monthlyCalls[period - 1] > 0);
  });
  readonly summaryRow = computed(() => this.reportProcessorService.buildSummaryRow(this.visibleRows()));
  readonly selectedMonthLabel = computed(
    () => this.months.find((month) => month.value === this.selectedPeriod())?.fullLabel ?? 'Anual',
  );
  readonly hasHistory = computed(() => this.historyEntries().length > 0);

  onYearChange(year: string | number) {
    const numericYear = Number(year);
    this.selectedYear.set(Number.isFinite(numericYear) ? numericYear : null);
  }

  onPeriodChange(period: string | number) {
    this.selectedPeriod.set(Number(period));
  }

  loadYear(year: number) {
    this.selectedYear.set(year);
  }

  removeSelectedYear() {
    const year = this.selectedYear();

    if (year === null) {
      return;
    }

    this.storageService.remove(year);
    this.refreshHistory();
    this.selectedYear.set(this.historyEntries()[0]?.year ?? null);
  }

  clearHistory() {
    const confirmAction = confirm("Ao clicar nesse botão, irá apagar todo o histórico (de todos os anos). Confirma?");
    
    if(confirmAction){
      this.storageService.clearAll();
      this.refreshHistory();
      this.selectedYear.set(null);
      this.selectedPeriod.set(0);
    };
  }

  isActivePeriod(month: number): boolean {
    return this.selectedPeriod() === month;
  }

  private refreshHistory() {
    this.historyVersion.update((value) => value + 1);
  }
}
