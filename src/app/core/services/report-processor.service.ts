import { Injectable } from '@angular/core';
import {
  REPORT_MONTHS,
  ReportAgentImport,
  ReportTableRow,
  StoredAnnualReport,
} from '../models/relatorio.model';

@Injectable({ providedIn: 'root' })
export class ReportProcessorService {
  readonly months = REPORT_MONTHS;

  buildRows(storedData: StoredAnnualReport): ReportTableRow[] {
    return Object.entries(storedData)
      .map(([normalizedName, entry]) =>
        this.createTableRow(normalizedName, entry.displayName, entry.monthlyCalls),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  mergeMonthlySnapshot(
    currentData: StoredAnnualReport,
    importedAgents: ReportAgentImport[],
    month: number,
  ): StoredAnnualReport {
    const mergedData: StoredAnnualReport = { ...currentData };

    for (const agent of importedAgents) {
      const normalizedName = this.normalizeAgentName(agent.agentName);
      const existingMonthlyCalls = mergedData[normalizedName]
        ? [...mergedData[normalizedName].monthlyCalls]
        : this.createEmptyMonthlyCalls();

      existingMonthlyCalls[month - 1] = agent.totalCalls;
      mergedData[normalizedName] = {
        displayName: agent.agentName.trim(),
        monthlyCalls: existingMonthlyCalls,
      };
    }

    return mergedData;
  }

  buildSummaryRow(rows: ReportTableRow[]): ReportTableRow {
    const monthlyCalls = Array.from({ length: 12 }, (_, index) =>
      rows.reduce((sum, row) => sum + row.monthlyCalls[index], 0),
    );

    return this.createTableRow('total', 'Total', monthlyCalls);
  }

  monthLabel(month: number): string {
    return this.months.find((item) => item.value === month)?.fullLabel ?? '';
  }

  updateMonthlyValue(
    currentData: StoredAnnualReport,
    agentKey: string,
    monthIndex: number,
    value: number,
  ): StoredAnnualReport {
    const sanitizedValue = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    const existingEntry = currentData[agentKey];
    const existingMonthlyCalls = existingEntry
      ? [...existingEntry.monthlyCalls]
      : this.createEmptyMonthlyCalls();

    existingMonthlyCalls[monthIndex] = sanitizedValue;

    return {
      ...currentData,
      [agentKey]: {
        displayName: existingEntry?.displayName ?? this.toTitleCase(agentKey),
        monthlyCalls: existingMonthlyCalls,
      },
    };
  }

  addAnalyst(currentData: StoredAnnualReport, analystName: string): StoredAnnualReport {
    const trimmedName = analystName.trim();
    const normalizedName = this.normalizeAgentName(trimmedName);

    if (!trimmedName || currentData[normalizedName]) {
      return currentData;
    }

    return {
      ...currentData,
      [normalizedName]: {
        displayName: trimmedName,
        monthlyCalls: this.createEmptyMonthlyCalls(),
      },
    };
  }

  removeAnalyst(currentData: StoredAnnualReport, agentKey: string): StoredAnnualReport {
    const updatedReport = { ...currentData };
    delete updatedReport[agentKey];
    return updatedReport;
  }

  private createTableRow(key: string, name: string, monthlyCalls: number[]): ReportTableRow {
    const totalCalls = monthlyCalls.reduce((sum, current) => sum + current, 0);
    const activeMonths = monthlyCalls.filter((value) => value > 0).length;

    return {
      key,
      name,
      monthlyCalls,
      totalCalls,
      activeMonths,
      monthlyAverage: activeMonths === 0 ? 0 : totalCalls / activeMonths,
    };
  }

  private createEmptyMonthlyCalls(): number[] {
    return Array.from({ length: 12 }, () => 0);
  }

  private normalizeAgentName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private toTitleCase(value: string): string {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
