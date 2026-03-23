import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { REPORT_MONTHS, StoredAnnualReport } from '../../core/models/relatorio.model';
import { FileParserService } from '../../core/services/file-parser.service';
import { ReportProcessorService } from '../../core/services/report-processor.service';
import { StorageService } from '../../core/services/storage.service';
import { DropzoneComponent } from '../../shared/components/dropzone/dropzone.component';
import { RetroButtonComponent } from '../../shared/components/retro-button/retro-button.component';

type DraftCellMap = Record<string, string>;

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, DropzoneComponent, RetroButtonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly fileParserService = inject(FileParserService);
  private readonly reportProcessorService = inject(ReportProcessorService);
  private readonly storageService = inject(StorageService);

  readonly currentYear = new Date().getFullYear();
  readonly months = REPORT_MONTHS;

  readonly selectedYear = signal(this.currentYear);
  readonly selectedMonth = signal(0);
  readonly annualReport = signal(this.storageService.load(this.selectedYear()));
  readonly importedFileName = signal('');
  readonly feedbackMessage = signal('Selecione um ficheiro para preencher o relatorio anual.');
  readonly selectedPeriodLabel = signal('');
  readonly hasImportedSnapshot = signal(false);
  readonly isBusy = signal(false);
  readonly isEditing = signal(false);
  readonly draftValues = signal<DraftCellMap>({});
  readonly newAnalystName = signal('');

  readonly tableRows = computed(() => this.reportProcessorService.buildRows(this.annualReport()));
  readonly summaryRow = computed(() => this.reportProcessorService.buildSummaryRow(this.tableRows()));
  readonly hasTableData = computed(() =>
    this.tableRows().some((row) => row.monthlyCalls.some((value) => value > 0)),
  );

  onMonthChange(month: number) {
    this.selectedMonth.set(Number(month));
  }

  async receiveFiles(files: File[]) {
    this.isBusy.set(true);

    let workingYear = this.selectedYear();
    let workingReport = this.annualReport();
    let latestFileName = this.importedFileName();
    let latestPeriodLabel = this.selectedPeriodLabel();
    const successes: string[] = [];
    const failures: string[] = [];

    try {
      for (const file of files) {
        try {
          const result = await this.importFileIntoReport(file, workingYear, workingReport);
          workingYear = result.referenceYear;
          workingReport = result.report;
          latestFileName = file.name;
          latestPeriodLabel = result.periodLabel;
          successes.push(result.monthLabel);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro ao ler o ficheiro.';
          failures.push(`${file.name}: ${message}`);
        }
      }

      if (successes.length) {
        this.selectedYear.set(workingYear);
        this.annualReport.set(workingReport);
        this.importedFileName.set(latestFileName);
        this.selectedPeriodLabel.set(latestPeriodLabel);
        this.hasImportedSnapshot.set(true);

        if (this.isEditing()) {
          this.syncDraftValuesFromReport(workingReport, true);
        }
      }

      if (successes.length && failures.length) {
        this.feedbackMessage.set(
          `${successes.length} ficheiro(s) importado(s). ${failures.length} falharam: ${failures.join(' | ')}`,
        );
      } else if (successes.length) {
        this.feedbackMessage.set(
          successes.length === 1
            ? `Arquivo processado para ${successes[0]}.`
            : `${successes.length} arquivos processados: ${successes.join(', ')}.`,
        );
      } else if (failures.length) {
        this.hasImportedSnapshot.set(false);
        this.feedbackMessage.set(failures.join(' | '));
      }
    } finally {
      this.isBusy.set(false);
    }
  }

  saveReport() {
    this.storageService.save(this.selectedYear(), this.annualReport());
    this.feedbackMessage.set(
      `Relatorio de ${this.selectedYear()} guardado com sucesso${this.importedFileName() ? ` a partir de ${this.importedFileName()}` : ''}.`,
    );
  }

  async exportReport() {
    try {
      await this.storageService.exportReport(this.selectedYear(), [
        ...this.tableRows(),
        this.summaryRow(),
      ]);

      this.feedbackMessage.set(`Relatorio exportado no modelo para ${this.selectedYear()}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao exportar o relatorio.';
      this.feedbackMessage.set(message);
    }
  }

  toggleEditing() {
    if (this.isEditing()) {
      this.applyDraftValues();
      this.isEditing.set(false);
      this.feedbackMessage.set('Edicao concluida.');
      return;
    }

    this.syncDraftValuesFromReport(this.annualReport(), false);
    this.isEditing.set(true);
  }

  getDraftValue(agentKey: string, monthIndex: number): string {
    return this.draftValues()[this.buildDraftKey(agentKey, monthIndex)] ?? '';
  }

  updateMonthlyValue(agentKey: string, monthIndex: number, value: string | number) {
    const sanitizedValue = String(value).replace(/[^\d]/g, '');
    const draftKey = this.buildDraftKey(agentKey, monthIndex);

    this.draftValues.update((current) => ({
      ...current,
      [draftKey]: sanitizedValue,
    }));
  }

  updateNewAnalystName(value: string) {
    this.newAnalystName.set(value);
  }

  addAnalyst() {
    const updatedReport = this.reportProcessorService.addAnalyst(
      this.annualReport(),
      this.newAnalystName(),
    );

    if (updatedReport === this.annualReport()) {
      this.feedbackMessage.set('Ja existe um analista com esse nome.');
      return;
    }

    this.annualReport.set(updatedReport);
    this.newAnalystName.set('');
    this.hasImportedSnapshot.set(true);

    if (this.isEditing()) {
      this.syncDraftValuesFromReport(updatedReport, true);
    }

    this.feedbackMessage.set('Analista adicionado manualmente.');
  }

  removeAnalyst(agentKey: string) {
    const updatedReport = this.reportProcessorService.removeAnalyst(this.annualReport(), agentKey);
    this.annualReport.set(updatedReport);
    this.hasImportedSnapshot.set(true);

    if (this.isEditing()) {
      this.syncDraftValuesFromReport(updatedReport, true);
    }

    this.feedbackMessage.set('Analista removido.');
  }

  clearCurrentPanel() {
    this.annualReport.set({});
    this.importedFileName.set('');
    this.selectedPeriodLabel.set('');
    this.hasImportedSnapshot.set(false);
    this.isEditing.set(false);
    this.draftValues.set({});
    this.newAnalystName.set('');
    this.feedbackMessage.set('Painel atual limpo.');
  }

  private async importFileIntoReport(
    file: File,
    workingYear: number,
    workingReport: StoredAnnualReport,
  ) {
    const parsedFile = await this.fileParserService.parse(file);
    const manualMonth = this.selectedMonth();
    const shouldDetectMonth = manualMonth === 0;
    const referenceMonth = shouldDetectMonth
      ? parsedFile.period?.referenceMonth ?? new Date().getMonth() + 1
      : manualMonth;
    const referenceYear = shouldDetectMonth
      ? parsedFile.period?.referenceYear ?? workingYear
      : workingYear;
    const periodLabel = parsedFile.period
      ? `${this.formatDate(parsedFile.period.startDate)} a ${this.formatDate(parsedFile.period.endDate)}`
      : '';

    const baseReport =
      referenceYear === workingYear ? workingReport : this.storageService.load(referenceYear);

    return {
      referenceYear,
      monthLabel: this.reportProcessorService.monthLabel(referenceMonth),
      periodLabel,
      report: this.reportProcessorService.mergeMonthlySnapshot(
        baseReport,
        parsedFile.agents,
        referenceMonth,
      ),
    };
  }

  private syncDraftValuesFromReport(report: StoredAnnualReport, preserveExisting: boolean) {
    const currentDrafts = this.draftValues();
    const nextDrafts: DraftCellMap = {};

    for (const row of this.reportProcessorService.buildRows(report)) {
      row.monthlyCalls.forEach((value, monthIndex) => {
        const key = this.buildDraftKey(row.key, monthIndex);
        nextDrafts[key] =
          preserveExisting && currentDrafts[key] !== undefined
            ? currentDrafts[key]
            : value > 0
              ? String(value)
              : '';
      });
    }

    this.draftValues.set(nextDrafts);
  }

  private applyDraftValues() {
    let updatedReport = this.annualReport();

    for (const row of this.tableRows()) {
      row.monthlyCalls.forEach((_, monthIndex) => {
        updatedReport = this.reportProcessorService.updateMonthlyValue(
          updatedReport,
          row.key,
          monthIndex,
          this.parseEditableValue(this.getDraftValue(row.key, monthIndex)),
        );
      });
    }

    this.annualReport.set(updatedReport);
    this.draftValues.set({});
    this.hasImportedSnapshot.set(true);
  }

  private parseEditableValue(value: string | number): number {
    const normalizedValue = String(value).replace(/\D/g, '');
    return normalizedValue ? Number(normalizedValue) : 0;
  }

  private buildDraftKey(agentKey: string, monthIndex: number): string {
    return `${agentKey}:${monthIndex}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
