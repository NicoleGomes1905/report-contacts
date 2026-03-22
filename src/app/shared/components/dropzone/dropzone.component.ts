import { Component, EventEmitter, Output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportMonthOption } from '../../../core/models/relatorio.model';

@Component({
  selector: 'app-dropzone',
  imports: [FormsModule],
  templateUrl: './dropzone.component.html',
  styleUrl: './dropzone.component.scss',
})
export class DropzoneComponent {
  readonly months = input.required<ReportMonthOption[]>();
  readonly selectedMonth = input.required<number>();

  @Output() readonly filesDropped = new EventEmitter<File[]>();
  @Output() readonly selectedMonthChange = new EventEmitter<number>();

  isDragging = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) {
      this.filesDropped.emit(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length) {
      this.filesDropped.emit(files);
      input.value = '';
    }
  }

  onMonthChange(month: number) {
    this.selectedMonthChange.emit(Number(month));
  }
}
