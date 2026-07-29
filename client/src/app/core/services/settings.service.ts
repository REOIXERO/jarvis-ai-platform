import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Settings,
  VoiceSettingsRequest
} from '../models/settings.model';
import { ApiResponse } from '../models/api.model';

/**
 * Handles all settings API calls.
 *
 * GET  /api/v1/settings       → current runtime config
 * PATCH /api/v1/settings/voice → update voice settings
 */
@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private readonly http = inject(HttpClient);

  getSettings(): Observable<ApiResponse<Settings>> {
    return this.http.get<ApiResponse<Settings>>(
      '/api/v1/settings'
    );
  }

  updateVoiceSettings(
    request: VoiceSettingsRequest
  ): Observable<ApiResponse<Settings>> {
    return this.http.patch<ApiResponse<Settings>>(
      '/api/v1/settings/voice',
      request
    );
  }
}
