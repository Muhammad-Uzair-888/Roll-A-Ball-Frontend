/**
 * API Client Service for Roll a Ball
 * Connects exclusively to the external Python API specified by VITE_API_BASE_URL.
 * No local algorithmic fallbacks.
 */

import {
  ApiHealthResponse,
  DijkstraRequest,
  DijkstraResponse,
  KnapsackRequest,
  KnapsackResponse,
  ApiErrorEnvelope,
} from '../types/api';

const TIMEOUT_MS = 8000;

function getBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
    '';
  if (!envUrl || envUrl.trim() === '') {
    return '';
  }
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

async function requestWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | ApiErrorEnvelope> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return {
      success: false,
      error: {
        code: 'API_URL_NOT_SET',
        message: 'API URL not set',
        details: [],
        request_id: '',
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const fullUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timer);

    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: `Invalid JSON response from server (HTTP ${response.status})`,
          details: [],
          request_id: '',
        },
      };
    }

    if (data && typeof data === 'object') {
      if (data.success === true) {
        return data as T;
      }
      if (data.success === false && data.error) {
        return data as ApiErrorEnvelope;
      }
      if (data.status === 'ok') {
        return data as T;
      }
    }

    return {
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: data?.message || data?.error?.message || `Request failed with status ${response.status}`,
        details: [],
        request_id: '',
      },
    };
  } catch (err: any) {
    clearTimeout(timer);

    if (err?.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out after 8 seconds',
          details: [],
          request_id: '',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Network request failed',
        details: [],
        request_id: '',
      },
    };
  }
}

export const apiClient = {
  getBaseUrl,

  /**
   * Check if the Python API service is running: GET {base}/api/health
   */
  async checkHealth(): Promise<ApiHealthResponse | { status: 'error'; message: string }> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return { status: 'error', message: 'API URL not set' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const fullUrl = `${baseUrl}/api/health`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);

      let data: any;
      try {
        data = await response.json();
      } catch {
        return { status: 'error', message: 'Invalid response from health endpoint' };
      }

      if (response.ok && data && data.status === 'ok') {
        return data as ApiHealthResponse;
      }
      return { status: 'error', message: data?.error?.message || 'API unreachable' };
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        return { status: 'error', message: 'Request timed out after 8 seconds' };
      }
      return { status: 'error', message: 'API unreachable' };
    }
  },

  /**
   * Request Dijkstra shortest path calculation: POST {base}/api/dijkstra
   * include_trace: true for Lab, false for gameplay
   */
  async solveDijkstra(request: DijkstraRequest): Promise<DijkstraResponse> {
    return requestWithTimeout<DijkstraResponse>('/api/dijkstra', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Request 0/1 Knapsack optimization: POST {base}/api/knapsack
   * include_trace: true for Lab, false for gameplay
   */
  async solveKnapsack(request: KnapsackRequest): Promise<KnapsackResponse> {
    return requestWithTimeout<KnapsackResponse>('/api/knapsack', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
