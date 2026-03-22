import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DashboardComponent } from '../dashboard.component';
import { FileParserService } from '../../core/services/file-parser.service';
import { StorageService } from '../../core/services/storage.service';
import { StoredAnnualReport } from '../../core/models/relatorio.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let fileParserServiceSpy: {
    parse: ReturnType<typeof vi.fn>;
  };
  let storageServiceSpy: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    exportReport: ReturnType<typeof vi.fn>;
    listHistory: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    clearAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    fileParserServiceSpy = {
      parse: vi.fn(),
    };
    storageServiceSpy = {
      load: vi.fn().mockReturnValue({}),
      save: vi.fn(),
      exportReport: vi.fn().mockResolvedValue(undefined),
      listHistory: vi.fn().mockReturnValue([]),
      remove: vi.fn(),
      clearAll: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: FileParserService, useValue: fileParserServiceSpy as Partial<FileParserService> },
        { provide: StorageService, useValue: storageServiceSpy as Partial<StorageService> },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('imports a file into the detected year without mixing reports from another year', async () => {
    const currentYearReport: StoredAnnualReport = {
      'alice current': {
        displayName: 'Alice Current',
        monthlyCalls: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    };
    const importedYearReport: StoredAnnualReport = {
      'maria antiga': {
        displayName: 'Maria Antiga',
        monthlyCalls: [0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    };

    storageServiceSpy.load.mockImplementation((year: number) => {
      if (year === 2025) {
        return importedYearReport;
      }

      return currentYearReport;
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();

    fileParserServiceSpy.parse.mockResolvedValue({
      agents: [{ agentName: 'Joana Fonseca', totalCalls: 25 }],
      period: {
        startDate: new Date('2025-03-01T00:00:00'),
        endDate: new Date('2025-03-31T00:00:00'),
        referenceMonth: 3,
        referenceYear: 2025,
      },
    });

    await component.receiveFiles([
      new File(['dummy'], 'Agent_Outbound_Inbound_2025-03-01-to-2025-03-31.xlsx'),
    ]);

    expect(component.selectedYear()).toBe(2025);
    expect(component.annualReport()).toEqual({
      'joana fonseca': {
        displayName: 'Joana Fonseca',
        monthlyCalls: [0, 0, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      'maria antiga': {
        displayName: 'Maria Antiga',
        monthlyCalls: [0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    });
    expect(component.annualReport()['alice current']).toBeUndefined();
  });

  it('preserves unsaved draft values when adding an analyst during edit mode', async () => {
    storageServiceSpy.load.mockReturnValue({
      'adelaide silva': {
        displayName: 'Adelaide Silva',
        monthlyCalls: [0, 0, 1001, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();

    component.toggleEditing();
    component.updateMonthlyValue('adelaide silva', 0, '55');
    component.updateNewAnalystName('Novo Analista');
    component.addAnalyst();

    expect(component.getDraftValue('adelaide silva', 0)).toBe('55');
    expect(component.annualReport()['novo analista']).toEqual({
      displayName: 'Novo Analista',
      monthlyCalls: Array.from({ length: 12 }, () => 0),
    });
  });

  it('keeps successful imports and reports partial failures when importing multiple files', async () => {
    fileParserServiceSpy.parse.mockImplementation(async (file: File) => {
      if (file.name.includes('bad')) {
        throw new Error('Arquivo invalido');
      }

      return {
        agents: [{ agentName: 'Catia Pereira', totalCalls: 44 }],
        period: {
          startDate: new Date('2026-04-01T00:00:00'),
          endDate: new Date('2026-04-30T00:00:00'),
          referenceMonth: 4,
          referenceYear: 2026,
        },
      };
    });

    await component.receiveFiles([
      new File(['ok'], 'Agent_Outbound_Inbound_2026-04-01-to-2026-04-30.xlsx'),
      new File(['bad'], 'bad-file.xlsx'),
    ]);

    expect(component.annualReport()['catia pereira']).toEqual({
      displayName: 'Catia Pereira',
      monthlyCalls: [0, 0, 0, 44, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(component.feedbackMessage()).toContain('1 ficheiro(s) importado(s)');
    expect(component.feedbackMessage()).toContain('bad-file.xlsx: Arquivo invalido');
  });

  it('clears the current panel without touching saved history', () => {
    component.annualReport.set({
      'catia pereira': {
        displayName: 'Catia Pereira',
        monthlyCalls: [0, 0, 44, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    });
    component.hasImportedSnapshot.set(true);
    component.importedFileName.set('file.xlsx');

    component.clearCurrentPanel();

    expect(component.annualReport()).toEqual({});
    expect(component.hasImportedSnapshot()).toBe(false);
    expect(component.importedFileName()).toBe('');
    expect(storageServiceSpy.clearAll).not.toHaveBeenCalled();
  });
});
