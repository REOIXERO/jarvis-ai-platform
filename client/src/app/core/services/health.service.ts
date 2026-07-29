import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Health check service.
 * Calls GET /actuator/health to get component status.
 * Used by the Settings page provider status section.
 */

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  components?: Record<string, ComponentHealth>;
}

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  details?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  private readonly http = inject(HttpClient);

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(
      '/actuator/health'
    );
  }
}
