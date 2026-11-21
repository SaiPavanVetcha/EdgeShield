# EdgeShield Web Monitoring & Analytics Dashboard

> **Full-stack telemetry observability dashboard and REST API querying the Databricks Lakehouse Gold layer.**  
> For the complete system architecture, data pipeline, and hardware clients, see the [Root README](../README.md).

This directory contains the full-stack web application for EdgeShield, delivering real-time and historical monitoring across connected PCs, embedded nodes, and ESP32 microcontrollers. The service queries the Databricks Lakehouse Gold Layer (`edgeshield_lakehouse.gold`) directly, providing interactive visual telemetry, room-level segmentation, and adaptive battery gating.

---

## Workspace Structure

* **[`backend/`](backend/)**: FastAPI analytical service querying Databricks SQL Gold tables with parameterized SQL, in-memory fallback caching, warehouse auto-stop/wake-up handling, and heuristic alerting.
* **[`frontend/`](frontend/)**: React 18 + Vite + TypeScript + Tailwind CSS dashboard with responsive Recharts time-series visualizations, room filtering, and device-level drilldown.

---

## Dashboard Scopes & Target Behavior

### 1. Fleet View
* Selected when Device is set to **"All Devices"** and Room is set to **"All Rooms"**.
* Displays aggregated fleet KPIs (average CPU utilization, total RAM used, peak disk utilization, and fleet battery stats).
* For battery metrics, fleet aggregations calculate averages strictly from devices where `battery.present = true` (or display `N/A` if no battery-capable endpoints exist in the fleet).

### 2. Physical Room View
* The **Room Filter** dropdown enables operators to filter telemetry by physical location (e.g. `Lab-101`, `Server-Room`, `Conference-A`).
* When a room is selected:
  - The **Device Selector** restricts its dropdown options strictly to devices assigned to that room.
  - KPI cards and time-series charts recalculate metrics scoped exclusively to endpoints within that room.

### 3. Single Device Drill-Down
* Selecting an individual device displays host metadata (hostname, platform, OS, CPU cores, physical room) and focused performance graphs.
* **Battery Capability Gating:**
  - **Laptops / Portable Nodes:** Displays the Battery KPI card (charge %, degradation) and the "Power & Battery" time series chart.
  - **Desktops / Stationary Servers:** The Battery KPI card and "Power & Battery" chart are dynamically suppressed. Missing battery hardware is never treated as an error, and low-battery alerts are suppressed for non-battery hardware.

### 4. Time Range Presets
* TopBar provides instant time range buttons: **`1h`**, **`6h`**, **`24h`**, **`7d`**, and **`All`**.
* The **`All`** preset sets an open lower time bound (`from_ts <= '2020-01-01'`), allowing users to inspect telemetry from the beginning of available history to the current timestamp.

---

## Alert Engine & Room Scoping Status

The backend evaluates deterministic heuristic rules against recent fact table telemetry:
* **Device Offline:** No telemetry recorded across fact tables for > 3 minutes.
* **CPU Utilization:** Sustained load > 85% in recent telemetry window.
* **RAM Utilization:** Memory usage > 90%.
* **Disk Space:** Storage utilization > 90%.
* **Ambient Temperature:** ESP32 sensor detecting > 35°C.
* **Battery Depleted or Degraded:** Battery charge < 20% or battery health < 60% (gated strictly to devices with `battery_pct IS NOT NULL`).

> [!NOTE]
> **Alerts + Room Scoping (In Progress):**  
> Currently, the alert engine evaluates active alerts fleet-wide across all registered devices. Dynamic room-scoped filtering of active alert lists is currently **in progress / planned** for a subsequent update.

---

## Safe Analytics SQL & Defense-in-Depth

All analytical queries target the Gold layer star schema in `edgeshield_lakehouse.gold`:
* `dim_device`: Device dimension (`device_key`, `device_id`, `hostname`, `platform`, `room`, `logical_cores`, `physical_cores`).
* `fact_cpu_telemetry`, `fact_ram_telemetry`, `fact_disk_telemetry`, `fact_battery_telemetry`, `fact_environment_telemetry`.

### Security Layer:
1. **Parameterized Execution:** Queries avoid f-string string interpolation for query filters. Dynamic values are bound as named parameters (`:device_key`, `:room`, `:from_ts`, `:to_ts`, `:window_ts`).
2. **Surrogate Key Resolution:** Single-device queries resolve `device_id` to an internal `device_key` via `dim_device` first, then query fact tables using `device_key = :device_key`.
3. **Allowlist Mapping:** Table names, column projections, and date truncation grains are resolved via static internal dictionaries (`METRIC_MAP`) and sets (`ALLOWED_TRUNC_GRAINS`). Unvalidated strings can never be placed into SQL identifier positions.

---

## Databricks Free Tier Auto-Stop Resiliency

Databricks Free Tier and Serverless SQL Warehouses automatically power down after 10–15 minutes of idle time to conserve compute credits:
1. **State Classification:** Connector exceptions are classified in real time as `online`, `starting`, `stopped`, or `unconfigured`.
2. **In-Memory Fallback Cache:** Successful queries are cached in memory for 3 minutes (`CACHE_TTL_SECONDS`). If the warehouse is sleeping or times out, the backend serves the last known good telemetry with an `is_cached: true` flag.
3. **One-Click Wake-Up Button:** If the warehouse is sleeping, an amber banner appears in the dashboard with a **"Wake Up Warehouse"** button. Clicking it dispatches an asynchronous ping (`SELECT 1`) to initiate compute spin-up while the frontend automatically polls until online.

---

## Quickstart Guide

### 1. Run the Backend API
```bash
# Navigate to backend
cd web/backend

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Configure DATABRICKS_HOST, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN
# DATABRICKS_CATALOG=edgeshield_lakehouse, DATABRICKS_SCHEMA=gold

# Start backend server on port 8000
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation: [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Run the Frontend UI
```bash
# Open a new terminal and navigate to frontend
cd web/frontend

# Install dependencies (Node.js 18+)
npm install

# Start development server on port 5173
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite dev server automatically proxies `/api` calls to `http://localhost:8000`.

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABRICKS_HOST` | **Yes** | — | Databricks workspace hostname (`dbc-xxxx.cloud.databricks.com`) |
| `DATABRICKS_HTTP_PATH` | **Yes** | — | SQL Warehouse HTTP path (`/sql/1.0/warehouses/xxxx`) |
| `DATABRICKS_TOKEN` | **Yes** | — | Databricks Personal Access Token (`dapi...`) |
| `DATABRICKS_CATALOG` | No | `edgeshield_lakehouse` | Unity Catalog catalog name |
| `DATABRICKS_SCHEMA` | No | `gold` | Target schema containing Gold layer Delta tables |
| `PORT` | No | `8000` | FastAPI server port |
| `CACHE_TTL_SECONDS` | No | `180` | In-memory fallback query cache duration (seconds) |
| `QUERY_TIMEOUT_SECONDS` | No | `45` | Databricks SQL query execution timeout |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Allowed CORS origins for browser access |
