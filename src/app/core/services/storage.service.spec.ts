import { vi } from 'vitest';
import { StorageService } from './storage.service';
import { ReportTableRow } from '../models/relatorio.model';

const excelJsMocks = vi.hoisted(() => {
  const writeBufferMock = vi.fn();
  const addWorksheetMock = vi.fn();
  const workbookConstructorMock = vi.fn();

  class Workbook {
    readonly xlsx = {
      writeBuffer: writeBufferMock,
    };

    constructor() {
      workbookConstructorMock();
    }

    addWorksheet = addWorksheetMock;
  }

  return {
    writeBufferMock,
    addWorksheetMock,
    workbookConstructorMock,
    Workbook,
  };
});

vi.mock('exceljs', () => ({
  default: {
    Workbook: excelJsMocks.Workbook,
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let anchorClickMock: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const originalCreateElement = document.createElement.bind(document);
    const worksheet = {
      addRow: vi.fn().mockReturnValue({
        getCell: vi.fn().mockReturnValue({ value: '' }),
      }),
      eachRow: vi.fn(),
      rowCount: 2,
      columns: [],
    };

    excelJsMocks.addWorksheetMock.mockReset();
    excelJsMocks.addWorksheetMock.mockReturnValue(worksheet);

    excelJsMocks.writeBufferMock.mockReset();
    excelJsMocks.writeBufferMock.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    excelJsMocks.workbookConstructorMock.mockReset();

    anchorClickMock = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        Object.defineProperty(anchor, 'click', {
          configurable: true,
          value: anchorClickMock,
        });

        return anchor;
      }

      return originalCreateElement(tagName);
    });

    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: () => '',
      });
    }

    if (!('revokeObjectURL' in URL)) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }

    createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    service = new StorageService();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('exports successfully when exceljs is exposed through the default export', async () => {
    const rows: ReportTableRow[] = [
      {
        key: 'joana-fonseca',
        name: 'Joana Fonseca',
        monthlyCalls: [0, 0, 0, 215, 0, 0, 0, 0, 0, 0, 0, 0],
        totalCalls: 215,
        activeMonths: 1,
        monthlyAverage: 215,
      },
      {
        key: 'total',
        name: 'Total',
        monthlyCalls: [0, 0, 0, 215, 0, 0, 0, 0, 0, 0, 0, 0],
        totalCalls: 215,
        activeMonths: 1,
        monthlyAverage: 215,
      },
    ];

    await service.exportReport(2026, rows);

    expect(excelJsMocks.workbookConstructorMock).toHaveBeenCalledTimes(1);
    expect(excelJsMocks.addWorksheetMock).toHaveBeenCalledWith('Relatorio');
    expect(excelJsMocks.writeBufferMock).toHaveBeenCalledTimes(1);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test');
  });
});
