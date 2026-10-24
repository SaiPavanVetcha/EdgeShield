import {
  DeviceListResponse,
  KPISummaryResponse,
  TimeseriesResponse,
  AlertListResponse,
  HealthResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${BASE_URL}${url}`;
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  async getDevices(): Promise<DeviceListResponse> {
    return fetchJson<DeviceListResponse>('/api/devices');
  },

  async getKPIs(deviceId: string = 'all', from?: string, to?: string): Promise<KPISummaryResponse> {
    const params = new URLSearchParams({ device_id: deviceId });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return fetchJson<KPISummaryResponse>(`/api/kpis?${params.toString()}`);
  },

  async getTimeseries(
    deviceId: string = 'all',
    metric: string = 'cpu',
    from?: string,
    to?: string
  ): Promise<TimeseriesResponse> {
    const params = new URLSearchParams({ device_id: deviceId, metric });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return fetchJson<TimeseriesResponse>(`/api/timeseries?${params.toString()}`);
  },

  async getAlerts(): Promise<AlertListResponse> {
    return fetchJson<AlertListResponse>('/api/alerts');
  },

  async acknowledgeAlert(alertId: string): Promise<{ status: string; alert_id: string; acknowledged: boolean }> {
    return fetchJson<{ status: string; alert_id: string; acknowledged: boolean }>(
      `/api/alerts/${encodeURIComponent(alertId)}/acknowledge`,
      { method: 'POST' }
    );
  },

  async getHealth(): Promise<HealthResponse> {
    return fetchJson<HealthResponse>('/api/health');
  },

  async wakeUpWarehouse(): Promise<{ status: string; message: string; warehouse_status: string }> {
    return fetchJson<{ status: string; message: string; warehouse_status: string }>(
      '/api/health/wake-up',
      { method: 'POST' }
    );
  },
};
