export interface ReportAgentImport {
  agentName: string;
  totalCalls: number;
}

export interface ParsedReportPeriod {
  startDate: Date;
  endDate: Date;
  referenceMonth: number;
  referenceYear: number;
}

export interface ParsedReportFile {
  agents: ReportAgentImport[];
  period: ParsedReportPeriod | null;
}

export interface ReportTableRow {
  key: string;
  name: string;
  monthlyCalls: number[];
  totalCalls: number;
  activeMonths: number;
  monthlyAverage: number;
}

export interface StoredAnnualReportEntry {
  displayName: string;
  monthlyCalls: number[];
}

export interface StoredAnnualReport {
  [normalizedAgentName: string]: StoredAnnualReportEntry;
}

export interface ReportHistoryEntry {
  year: number;
  analystCount: number;
  filledMonths: number;
  totalCalls: number;
}

export interface ReportMonthOption {
  value: number;
  shortLabel: string;
  fullLabel: string;
}

export const REPORT_MONTHS: ReportMonthOption[] = [
  { value: 1, shortLabel: 'Jan', fullLabel: 'Janeiro' },
  { value: 2, shortLabel: 'Fev', fullLabel: 'Fevereiro' },
  { value: 3, shortLabel: 'Mar', fullLabel: 'Marco' },
  { value: 4, shortLabel: 'Abr', fullLabel: 'Abril' },
  { value: 5, shortLabel: 'Mai', fullLabel: 'Maio' },
  { value: 6, shortLabel: 'Jun', fullLabel: 'Junho' },
  { value: 7, shortLabel: 'Jul', fullLabel: 'Julho' },
  { value: 8, shortLabel: 'Ago', fullLabel: 'Agosto' },
  { value: 9, shortLabel: 'Set', fullLabel: 'Setembro' },
  { value: 10, shortLabel: 'Out', fullLabel: 'Outubro' },
  { value: 11, shortLabel: 'Nov', fullLabel: 'Novembro' },
  { value: 12, shortLabel: 'Dez', fullLabel: 'Dezembro' },
];

export const REPORT_STORAGE_KEY = 'annual-call-report';
