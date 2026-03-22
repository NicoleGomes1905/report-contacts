import { Injectable } from '@angular/core';
import {
  ReportHistoryEntry,
  REPORT_STORAGE_KEY,
  ReportTableRow,
  StoredAnnualReport,
  StoredAnnualReportEntry,
} from '../models/relatorio.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  load(year: number): StoredAnnualReport {
    const allReports = this.readStorage();
    return this.normalizeStoredReport(allReports[String(year)] ?? {});
  }

  save(year: number, report: StoredAnnualReport): void {
    const allReports = this.readStorage();
    allReports[String(year)] = report;
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(allReports));
  }

  remove(year: number): void {
    const allReports = this.readStorage();
    delete allReports[String(year)];
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(allReports));
  }

  clearAll(): void {
    localStorage.removeItem(REPORT_STORAGE_KEY);
  }

  listHistory(): ReportHistoryEntry[] {
    const allReports = this.readStorage();

    return Object.entries(allReports)
      .map(([year, report]) => {
        const normalizedReport = this.normalizeStoredReport(report);
        const entries = Object.values(normalizedReport);
        const monthlyTotals = Array.from({ length: 12 }, (_, monthIndex) =>
          entries.reduce((sum, entry) => sum + (entry.monthlyCalls[monthIndex] ?? 0), 0),
        );

        return {
          year: Number(year),
          analystCount: entries.length,
          filledMonths: monthlyTotals.filter((value) => value > 0).length,
          totalCalls: monthlyTotals.reduce((sum, value) => sum + value, 0),
        };
      })
      .filter((entry) => Number.isFinite(entry.year))
      .sort((left, right) => right.year - left.year);
  }

  async exportReport(year: number, rows: ReportTableRow[]): Promise<void> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatorio');

    worksheet.addRow(this.buildHeaderRow());

    rows.forEach((row, index) => {
      const excelRowIndex = index + 2;
      const isSummaryRow = row.key === 'total';
      const worksheetRow = worksheet.addRow(this.buildMonthCells(row));

      worksheetRow.getCell(14).value = { formula: `SUM(B${excelRowIndex}:M${excelRowIndex})` };

      if (isSummaryRow) {
        worksheetRow.getCell(15).value = '';
        worksheetRow.getCell(16).value = '';
      } else {
        worksheetRow.getCell(15).value = { formula: `COUNTIF(B${excelRowIndex}:M${excelRowIndex},">0")` };
        worksheetRow.getCell(16).value = { formula: `N${excelRowIndex}/O${excelRowIndex}` };
      }
    });

    this.applyWorksheetStyle(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-anual-${year}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private readStorage(): Record<string, StoredAnnualReport> {
    const rawValue = localStorage.getItem(REPORT_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    try {
      return JSON.parse(rawValue) as Record<string, StoredAnnualReport>;
    } catch {
      return {};
    }
  }

  private normalizeStoredReport(report: StoredAnnualReport): StoredAnnualReport {
    return Object.fromEntries(
      Object.entries(report).map(([key, value]) => {
        if (Array.isArray(value)) {
          const migratedEntry: StoredAnnualReportEntry = {
            displayName: this.toTitleCase(key),
            monthlyCalls: value,
          };

          return [key, migratedEntry];
        }

        return [key, value];
      }),
    );
  }

  private buildHeaderRow(): string[] {
    return [
      'Nome',
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
      'Total de chamadas',
      'Num Meses',
      'Media Mensal',
    ];
  }

  private buildMonthCells(row: ReportTableRow): Array<string | number> {
    return [
      row.name,
      ...row.monthlyCalls.map((value) => (value === 0 ? '' : value)),
      '',
      '',
      '',
    ];
  }

  private applyWorksheetStyle(worksheet: import('exceljs').Worksheet): void {
    worksheet.columns = [
      { width: 22 },
      ...Array.from({ length: 12 }, () => ({ width: 10 })),
      { width: 24 },
      { width: 14 },
      { width: 16 },
    ];

    const border = {
      top: { style: 'thin' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } },
    };

    worksheet.eachRow((row, rowNumber) => {
      row.height = 22;

      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.border = border;
        cell.alignment = {
          vertical: 'middle',
          horizontal: columnNumber === 1 ? 'left' : 'center',
        };
        cell.font = { name: 'Calibri', size: 11 };

        if (rowNumber === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E2F3' },
          };
          cell.font = { name: 'Calibri', size: 11, bold: true };
        }
      });

      if (rowNumber === worksheet.rowCount) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: 'Calibri', size: 11, bold: true };
        });
      }
    });
  }

  private toTitleCase(value: string): string {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
