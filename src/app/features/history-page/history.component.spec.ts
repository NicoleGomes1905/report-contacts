import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HistoryComponent } from './history.component';
import { StorageService } from '../../core/services/storage.service';
import { ReportProcessorService } from '../../core/services/report-processor.service';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let storageServiceSpy: {
    listHistory: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    clearAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    storageServiceSpy = {
      listHistory: vi.fn().mockReturnValue([
        { year: 2026, analystCount: 2, filledMonths: 2, totalCalls: 300 },
      ]),
      load: vi.fn().mockReturnValue({
        'adelaide silva': {
          displayName: 'Adelaide Silva',
          monthlyCalls: [0, 0, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        'andre sousa': {
          displayName: 'Andre Sousa',
          monthlyCalls: [0, 0, 90, 60, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      }),
      remove: vi.fn(),
      clearAll: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [
        { provide: StorageService, useValue: storageServiceSpy as Partial<StorageService> },
        ReportProcessorService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('filters visible rows by selected month', () => {
    component.onPeriodChange(4);

    expect(component.visibleRows().length).toBe(2);
    expect(component.summaryRow().monthlyCalls[3]).toBe(110);
  });
});
