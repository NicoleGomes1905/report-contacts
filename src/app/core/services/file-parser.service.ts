import { Injectable } from '@angular/core';
import { ParsedReportFile, ReportAgentImport } from '../models/relatorio.model';

@Injectable({ providedIn: 'root' })
export class FileParserService {
  async parse(file: File): Promise<ParsedReportFile> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !['xlsx', 'csv'].includes(extension)) {
      throw new Error('Formato invalido. Use um arquivo XLSX ou CSV.');
    }

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      throw new Error('Nao foi possivel encontrar a folha de dados no arquivo.');
    }

    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (!rows.length) {
      throw new Error('O arquivo nao contem linhas para processar.');
    }

    const headerRowIndex = rows.findIndex((row) => this.isHeaderRow(row));
    if (headerRowIndex === -1) {
      throw new Error('Nao encontrei as colunas Name e Total Calls no arquivo.');
    }

    const headerRow = rows[headerRowIndex].map((cell) => String(cell).trim());
    const nameIndex = 0;
    const totalCallsIndex = headerRow.findIndex((cell) => cell === 'Total Calls');

    const parsedRows = rows
      .slice(headerRowIndex + 1)
      .map((row) => this.mapRow(row, nameIndex, totalCallsIndex))
      .filter((row): row is ReportAgentImport => row !== null);

    if (!parsedRows.length) {
      throw new Error('O arquivo foi lido, mas nenhuma linha valida de agente foi encontrada.');
    }

    return {
      agents: parsedRows,
      period: this.extractPeriodFromFilename(file.name),
    };
  }

  private isHeaderRow(row: (string | number)[]): boolean {
    const normalizedCells = row.map((cell) => String(cell).trim());
    return normalizedCells.includes('Total Calls');
  }

  private mapRow(
    row: (string | number)[],
    nameIndex: number,
    totalCallsIndex: number,
  ): ReportAgentImport | null {
    const rawName = String(row[nameIndex] ?? '').trim();
    const totalCalls = this.parseNumericValue(row[totalCallsIndex] ?? '');

    const normalizedName = this.normalizeAgentName(rawName);

    if (!rawName || normalizedName === 'total' || normalizedName === 'totals') {
      return null;
    }

    if (Number.isNaN(totalCalls)) {
      return null;
    }

    return {
      agentName: rawName,
      totalCalls,
    };
  }

  private parseNumericValue(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    const normalizedValue = String(value).replace(/\s/g, '').replace(/,/g, '');
    return Number(normalizedValue);
  }

  private normalizeAgentName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private extractPeriodFromFilename(fileName: string) {
    const match = fileName.match(/(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})/i);

    if (!match) {
      return null;
    }

    const startDate = new Date(`${match[1]}T00:00:00`);
    const endDate = new Date(`${match[2]}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }

    return {
      startDate,
      endDate,
      referenceMonth: endDate.getMonth() + 1,
      referenceYear: endDate.getFullYear(),
    };
  }
}
