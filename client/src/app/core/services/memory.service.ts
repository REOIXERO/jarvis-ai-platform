import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Memory,
  MemoryCount,
  MemoryRequest
} from '../models/memory.model';
import { ApiResponse } from '../models/api.model';

/**
 * Handles all memory API calls.
 *
 * GET    /api/v1/memories       → list all memories
 * GET    /api/v1/memories/count → total count
 * POST   /api/v1/memories       → create manual memory
 * DELETE /api/v1/memories/{id}  → delete one memory
 * DELETE /api/v1/memories       → delete all memories
 */
@Injectable({
  providedIn: 'root'
})
export class MemoryService {

  private readonly http = inject(HttpClient);

  getMemories(): Observable<ApiResponse<Memory[]>> {
    return this.http.get<ApiResponse<Memory[]>>(
      '/api/v1/memories'
    );
  }

  getCount(): Observable<ApiResponse<MemoryCount>> {
    return this.http.get<ApiResponse<MemoryCount>>(
      '/api/v1/memories/count'
    );
  }

  createMemory(
    request: MemoryRequest
  ): Observable<ApiResponse<Memory>> {
    return this.http.post<ApiResponse<Memory>>(
      '/api/v1/memories',
      request
    );
  }

  deleteMemory(
    memoryId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/memories/${memoryId}`
    );
  }

  deleteAllMemories(): Observable<void> {
    return this.http.delete<void>(
      '/api/v1/memories'
    );
  }
}
