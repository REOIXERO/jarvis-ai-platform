import {
  Component,
  inject,
  signal,
  OnInit
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SettingsService }
  from '../../core/services/settings.service';
import { HealthService }
  from '../../core/services/health.service';
import { Settings }
  from '../../core/models/settings.model';

/**
 * Settings page.
 *
 * Three sections:
 * 1. Voice settings — name + speed (PATCH /settings/voice)
 * 2. Provider status — Ollama/Redis/PostgreSQL health
 * 3. System info — version + Java version
 *
 * No SSE. Pure REST calls + reactive form.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class settings implements OnInit {

  private readonly settingsService =
    inject(SettingsService);
  private readonly healthService =
    inject(HealthService);
  private readonly fb = inject(FormBuilder);

  // ── State signals ─────────────────────────────

  readonly settings =
    signal<Settings | null>(null);

  readonly isLoading = signal(true);

  readonly isSaving = signal(false);

  readonly saveSuccess = signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  readonly healthStatus = signal<
    Record<string, 'UP' | 'DOWN' | 'UNKNOWN'>
  >({});

  readonly isHealthLoading = signal(true);

  // ── Form ──────────────────────────────────────

  readonly voiceForm = this.fb.group({
    voiceName: [''],
    voiceSpeed: [1.0, [
      Validators.required,
      Validators.min(0.5),
      Validators.max(2.0)
    ]]
  });

  // ── Lifecycle ─────────────────────────────────

  ngOnInit(): void {
    this.loadSettings();
    this.loadHealth();
  }

  // ── Load settings ─────────────────────────────

  loadSettings(): void {
    this.isLoading.set(true);

    this.settingsService.getSettings().subscribe({
      next: response => {
        this.settings.set(response.data);
        this.isLoading.set(false);

        // Pre-fill form with current values
        this.voiceForm.patchValue({
          voiceName:  response.data.voice.voiceName,
          voiceSpeed: response.data.voice.voiceSpeed
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          'Failed to load settings.'
        );
      }
    });
  }

  // ── Load health ───────────────────────────────

  loadHealth(): void {
    this.isHealthLoading.set(true);

    this.healthService.getHealth().subscribe({
      next: response => {
        const statuses: Record<
          string, 'UP' | 'DOWN' | 'UNKNOWN'
        > = {};

        if (response.components) {
          // Only show meaningful components
          const show = [
            'db', 'redis', 'ollama'
          ];

          for (const key of show) {
            if (response.components[key]) {
              statuses[key] =
                response.components[key].status;
            }
          }
        }

        this.healthStatus.set(statuses);
        this.isHealthLoading.set(false);
      },
      error: () => {
        this.isHealthLoading.set(false);
      }
    });
  }

  // ── Save voice settings ───────────────────────

  saveVoiceSettings(): void {
    if (this.voiceForm.invalid || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.errorMessage.set(null);

    const { voiceName, voiceSpeed } =
      this.voiceForm.value;

    this.settingsService
      .updateVoiceSettings({
        voiceName:  voiceName || null,
        voiceSpeed: voiceSpeed ?? 1.0
      })
      .subscribe({
        next: response => {
          this.settings.set(response.data);
          this.isSaving.set(false);
          this.saveSuccess.set(true);

          // Clear success message after 3s
          setTimeout(() => {
            this.saveSuccess.set(false);
          }, 3000);
        },
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set(
            'Failed to save voice settings.'
          );
        }
      });
  }

  // ── Helpers ───────────────────────────────────

  getComponentLabel(key: string): string {
    const labels: Record<string, string> = {
      db:     'PostgreSQL',
      redis:  'Redis',
      ollama: 'Ollama'
    };
    return labels[key] ?? key;
  }

  getComponentIcon(key: string): string {
    const icons: Record<string, string> = {
      db:     'database',
      redis:  'memory',
      ollama: 'smart_toy'
    };
    return icons[key] ?? 'circle';
  }

  isUp(status: 'UP' | 'DOWN' | 'UNKNOWN'): boolean {
    return status === 'UP';
  }

  formatSpeed(speed: number): string {
    return `${speed.toFixed(1)}x`;
  }

  get healthEntries(): Array<{
    key: string;
    status: 'UP' | 'DOWN' | 'UNKNOWN'
  }> {
    return Object.entries(this.healthStatus())
      .map(([key, status]) => ({ key, status }));
  }
}
