# EdgeShield Web Frontend

> **React 18 + Vite + TypeScript telemetry and analytics dashboard.**  
> For the web application overview, see the [Web README](../README.md). For overall system architecture, see the [Root README](../../README.md).

This folder contains the client-side user interface for EdgeShield. It provides real-time and historical visualization of edge device telemetry, fleet-level KPI cards, interactive time-series charts, heuristic alert management, and automated sleeping warehouse detection with one-click wake-up controls.

---

## Requirements

* Node.js 18+
* npm 9+ (or pnpm / yarn)
* Running EdgeShield Web Backend on `http://localhost:8000` (see [`../backend/README.md`](../backend/README.md))

---

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   The dashboard will be available at [http://localhost:5173](http://localhost:5173).

3. **Build for production:**
   ```bash
   npm run build
   ```
   Compiled static assets will be output to `dist/`.

4. **Preview production build locally:**
   ```bash
   npm run preview
   ```

---

## Configuration & Proxy

The development server is configured in `vite.config.ts` to automatically proxy all `/api` requests to the local backend:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

If your backend is running on a different port or host, adjust the `target` URL in `vite.config.ts`.

---

## Dashboard Capabilities

* **Fleet vs. Device Scoping:** Filter telemetry across all connected devices (`device_id=all`) or drill into a specific workstation, embedded PC, or ESP32 node.
* **KPI Metrics:** At-a-glance cards for CPU utilization, RAM usage, storage availability, battery percentage and health, and ambient temperature/humidity.
* **Telemetry Charts:** Responsive line and area charts rendered with Recharts, with time window selectors (1h, 6h, 24h, 7d).
* **Warehouse Auto-Stop Banner:** Automatically detects when the Databricks Free Tier SQL Warehouse is asleep, displaying an amber alert banner with a **"Wake Up Warehouse"** button that sends `POST /api/health/wake-up` and polls until online.
* **Alerts View:** Lists active heuristic threshold alerts (offline device, high CPU/RAM, storage saturation, elevated temperature, low battery health) with one-click acknowledgment.

