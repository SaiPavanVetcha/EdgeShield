import {
  ConsoleStatusResponse,
  DeviceListResponse,
  StorageModeUpdateResponse,
  FlushResponse,
  LogsResponse,
} from './types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err && err.detail) msg = err.detail;
      else if (err && err.message) msg = err.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

export const consoleApi = {
  async getStatus(): Promise<ConsoleStatusResponse> {
    return fetchJson<ConsoleStatusResponse>('/api/console/status');
  },

  async getDevices(): Promise<DeviceListResponse> {
    return fetchJson<DeviceListResponse>('/api/console/devices');
  },

  async setStorageMode(mode: 'local' | 'databricks'): Promise<StorageModeUpdateResponse> {
    return fetchJson<StorageModeUpdateResponse>('/api/console/storage-mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  async triggerFlush(): Promise<FlushResponse> {
    return fetchJson<FlushResponse>('/api/console/flush', {
      method: 'POST',
    });
  },

  async getLogs(limit: number = 150): Promise<LogsResponse> {
    return fetchJson<LogsResponse>(`/api/console/logs?limit=${limit}`);
  },

  getExportUrl(format: 'jsonl' | 'sqlite' = 'jsonl'): string {
    return `/api/console/export?format=${format}`;
  },

  downloadSpoolExport(format: 'jsonl' | 'sqlite' = 'jsonl'): void {
    const url = `/api/console/export?format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
