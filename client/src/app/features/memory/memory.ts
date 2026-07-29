import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MemoryService }
  from '../../core/services/memory.service';
import {
  Memory,
  MemoryType,
  MEMORY_TYPE_COLORS
} from '../../core/models/memory.model';

/**
 * Memory management page.
 *
 * Shows all long-term memories Jarvis has learned.
 * Allows manual add, delete per item, and clear all.
 *
 * No SSE — pure REST calls with reactive signals.
 */
@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './memory.html',
  styleUrl: './memory.scss'
})
export class MemoryPage implements OnInit {

  private readonly memoryService =
    inject(MemoryService);
  private readonly fb = inject(FormBuilder);

  // Focus target inside confirm dialog box
  @ViewChild('confirmBox')
  confirmBox?: ElementRef<HTMLDivElement>;

  // ── State signals ─────────────────────────────

  readonly memories = signal<Memory[]>([]);

  readonly totalCount = signal(0);

  readonly isLoading = signal(true);

  readonly isAdding = signal(false);

  readonly showAddForm = signal(false);

  readonly deletingId = signal<string | null>(null);

  readonly isClearing = signal(false);

  readonly showClearConfirm = signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  readonly successMessage =
    signal<string | null>(null);

  // ── Memory types for dropdown ─────────────────

  readonly memoryTypes: MemoryType[] = [
    'FACT',
    'GOAL',
    'PREFERENCE',
    'CONTEXT',
    'EVENT'
  ];

  // ── Computed ──────────────────────────────────

  readonly hasMemories = computed(() =>
    this.memories().length > 0
  );

  // ── Add form ──────────────────────────────────

  readonly addForm = this.fb.group({
    memoryType: [
      'FACT' as MemoryType,
      Validators.required
    ],
    content: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(500)
    ]]
  });

  // ── Lifecycle ─────────────────────────────────

  ngOnInit(): void {
    this.loadMemories();
  }

  // ── Load ──────────────────────────────────────

  loadMemories(): void {
    this.isLoading.set(true);

    this.memoryService.getMemories().subscribe({
      next: response => {
        // Guard against missing data payload
        // Prevents thrown errors bypassing error handler
        const items = response.data ?? [];
        this.memories.set(items);
        this.totalCount.set(items.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          'Failed to load memories.'
        );
      }
    });
  }

  // ── Add ───────────────────────────────────────

  toggleAddForm(): void {
    this.showAddForm.update(v => !v);
    this.addForm.reset({
      memoryType: 'FACT',
      content: ''
    });
    this.errorMessage.set(null);
  }

  addMemory(): void {
    if (this.addForm.invalid || this.isAdding()) {
      return;
    }

    this.isAdding.set(true);
    this.errorMessage.set(null);

    const { memoryType, content } =
      this.addForm.value;

    this.memoryService.createMemory({
      memoryType: memoryType as MemoryType,
      content: content!.trim()
    }).subscribe({
      next: response => {
        this.memories.update(list =>
          [response.data, ...list]
        );
        this.totalCount.update(n => n + 1);
        this.isAdding.set(false);
        this.showAddForm.set(false);
        this.addForm.reset({
          memoryType: 'FACT',
          content: ''
        });
        this.showSuccess(
          'Memory added successfully.'
        );
      },
      error: err => {
        this.isAdding.set(false);
        this.errorMessage.set(
          err.status === 409
            ? 'This memory already exists.'
            : 'Failed to add memory.'
        );
      }
    });
  }

  // ── Delete one ────────────────────────────────

  deleteMemory(memory: Memory): void {
    if (this.deletingId()) return;

    this.deletingId.set(memory.id);
    this.errorMessage.set(null);

    this.memoryService
      .deleteMemory(memory.id)
      .subscribe({
        next: () => {
          this.memories.update(list =>
            list.filter(m => m.id !== memory.id)
          );
          this.totalCount.update(n => n - 1);
          this.deletingId.set(null);
        },
        error: () => {
          this.deletingId.set(null);
          this.errorMessage.set(
            'Failed to delete memory.'
          );
        }
      });
  }

  // ── Clear all ─────────────────────────────────

  confirmClear(): void {
    this.showClearConfirm.set(true);
    // Move focus into dialog after Angular renders it
    setTimeout(() => {
      this.confirmBox?.nativeElement?.focus();
    }, 50);
  }

  cancelClear(): void {
    this.showClearConfirm.set(false);
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelClear();
    }
  }

  clearAllMemories(): void {
    // Re-entrancy guard — prevents double-click
    // firing two DELETE requests
    if (this.isClearing()) return;

    this.isClearing.set(true);
    this.showClearConfirm.set(false);
    this.errorMessage.set(null);

    this.memoryService
      .deleteAllMemories()
      .subscribe({
        next: () => {
          this.memories.set([]);
          this.totalCount.set(0);
          this.isClearing.set(false);
          this.showSuccess(
            'All memories cleared.'
          );
        },
        error: () => {
          this.isClearing.set(false);
          this.errorMessage.set(
            'Failed to clear memories.'
          );
        }
      });
  }

  // ── Helpers ───────────────────────────────────

  getTypeBadgeColor(type: MemoryType): string {
    return MEMORY_TYPE_COLORS[type];
  }

  getTypeLabel(type: MemoryType): string {
    const labels: Record<MemoryType, string> = {
      FACT:       'Fact',
      GOAL:       'Goal',
      PREFERENCE: 'Preference',
      CONTEXT:    'Context',
      EVENT:      'Event'
    };
    return labels[type];
  }

  getTypeIcon(type: MemoryType): string {
    const icons: Record<MemoryType, string> = {
      FACT:       'info',
      GOAL:       'flag',
      PREFERENCE: 'tune',
      CONTEXT:    'work',
      EVENT:      'event'
    };
    return icons[type];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(
      undefined,
      {
        year:  'numeric',
        month: 'short',
        day:   'numeric'
      }
    );
  }

  trackByMemory(
    index: number,
    memory: Memory
  ): string {
    return memory.id;
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }
}
