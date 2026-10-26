# EdgeShield Telemetry & Monitoring Dashboard

A clean, production-grade edge telemetry monitoring dashboard and API built from scratch for the EdgeShield project. The system reads directly from the Databricks Lakehouse Gold Layer (`edgeshield_lakehouse.gold`) and delivers real-time observability across edge devices and microcontrollers.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │          Databricks Lakehouse                │
                      │         (Catalog: edgeshield_lakehouse)      │
                      │               Schema: gold                   │
                      │ ──────────────────────────────────────────── │
                      │ • dim_device                                 │
                      │ • fact_cpu_telemetry                         │
                      │ • fact_ram_telemetry                         │
                      │ • fact_disk_telemetry                        │
                      │ • fact_battery_telemetry                     │
                      │ • fact_environment_telemetry                 │
                      └──────────────────────┬───────────────────────┘
                                             │ SQL over HTTP
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │              EdgeShield Backend              │
                      │            (Python 3.11+ / FastAPI)          │
                      │ ──────────────────────────────────────────── │
                      │ • In-Memory Fallback Cache (3-minute TTL)    │
                      │ • Free Tier Auto-Stop Resiliency Engine      │
                      │ • Rule-Based Alert Heuristics                │
                      │ • REST Endpoints (/api/*)                    │
                      └──────────────────────┬───────────────────────┘
                                             │ JSON API (Port 8000)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             EdgeShield Frontend              │
                      │           (React 18 + Vite + TS)             │
                      │ ──────────────────────────────────────────── │
                      │ • Dark Minimalist Theme (Tailwind CSS)       │
                      │ • Responsive Telemetry Charts (Recharts)     │
                      │ • Sleeping Warehouse Detection & Wake-Up UI  │
                      │ • Dynamic Scope: Fleet vs. Individual Device │
                      └──────────────────────────────────────────────┘
```

---

## Directory Structure

```
web/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & router mounting
│   │   ├── config.py                   # Pydantic configuration & env parsing
│   │   ├── database.py                 # Databricks SQL connection & auto-stop manager
│   │   ├── models.py                   # Pydantic data contracts & schemas
│   │   ├── routers/
│   │   │   ├── devices.py              # GET /api/devices
│   │   │   ├── kpis.py                 # GET /api/kpis
│   │   │   ├── timeseries.py           # GET /api/timeseries
│   │   │   ├── alerts.py               # GET/POST /api/alerts
│   │   │   └── health.py               # GET /api/health & POST /api/health/wake-up
│   │   └── services/
│   │       ├── databricks_service.py   # Gold layer SQL query execution
│   │       └── alert_engine.py         # Heuristic rules evaluation
│   ├── requirements.txt                # Python backend dependencies
│   ├── .env.example                    # Template for Databricks credentials
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/                 # Sidebar, TopBar, KPICard, ChartCard, etc.
│   │   ├── pages/                      # Dashboard, Devices, Alerts, Settings
│   │   ├── hooks/                      # useTelemetry state management hook
│   │   ├── services/                   # Typed API client
│   │   ├── types/                      # TypeScript domain definitions
│   │   ├── App.tsx                     # Top-level routing and layout
│   │   ├── main.tsx                    # React application entrypoint
│   │   └── index.css                   # Tailwind directives and custom scrollbars
│   ├── package.json
│   ├── vite.config.ts                  # Vite config with backend proxy
│   ├── tailwind.config.js              # Dark theme styling tokens
│   └── index.html
└── README.md
```

---

## Quickstart Guide

### 1. Backend Setup

1. Open a terminal in `web/backend`:
   ```bash
   cd web/backend
   ```

2. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```

3. Populate `.env` with your Databricks workspace credentials:
   ```ini
   DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
   DATABRICKS_TOKEN=dapi_your_databricks_access_token_here
   DATABRICKS_CATALOG=edgeshield_lakehouse
   DATABRICKS_SCHEMA=gold
   ```

4. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

5. Launch the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup

1. Open a second terminal in `web/frontend`:
   ```bash
   cd web/frontend
   ```

2. Install dependencies (Node 18+):
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   The application will run at [http://localhost:5173](http://localhost:5173).

---

## How Databricks Free Tier Auto-Stop Works

Databricks Free Tier and Serverless SQL Warehouses automatically power down after 10–15 minutes of inactivity to save compute credits.

### The Problem
When a user visits a traditional dashboard while the warehouse is stopped:
- Initial queries either hang for 30–60 seconds while compute boots up, or fail with a 503/timeout exception.
- Raw error screens or blank cards degrade user experience.

### The EdgeShield Solution
1. **Intelligent State Classification:** The backend inspects connector exceptions (`database.py`) and categorizes warehouse status into:
   - `online`: Responsive within normal latency.
   - `starting`: Compute node spin-up sequence in progress.
   - `stopped`: Warehouse sleeping due to inactivity.
   - `unconfigured`: Missing connection credentials.
2. **Resilient Fallback Cache:** Every successful query is cached in-memory for 3 minutes. If the warehouse auto-stops or times out, the backend serves the last known good data with an `is_cached: true` indicator instead of crashing.
3. **One-Click Wake-Up Button:**
   - If the warehouse is sleeping, a prominent amber notification banner appears with a **"Wake Up Warehouse"** button.
   - Clicking this button invokes `POST /api/health/wake-up`, which dispatches a lightweight asynchronous `SELECT 1` ping.
   - The frontend transitions to a polite polling state ("Starting Databricks SQL Warehouse... typically completes in 15–45s") and automatically refreshes all charts the moment the warehouse comes online.

---

## Gold Layer Schema Reference

All queries strictly target the Gold Layer Delta tables in catalog `edgeshield_lakehouse`, schema `gold`:

| Table | Granularity | Key Telemetry Columns |
| :--- | :--- | :--- |
| `dim_device` | Device dimension | `device_key`, `device_id`, `hostname`, `platform`, `logical_cores`, `physical_cores` |
| `fact_cpu_telemetry` | CPU load events | `cpu_utilization_pct`, `cpu_freq_current_mhz`, `cpu_freq_max_mhz` |
| `fact_ram_telemetry` | Memory load events | `ram_utilization_pct`, `ram_used_bytes`, `ram_available_bytes`, `ram_available_mb` |
| `fact_disk_telemetry` | Storage events | `mount_point`, `disk_utilization_pct`, `disk_used_bytes`, `disk_free_gb` |
| `fact_battery_telemetry` | Power telemetry | `battery_pct`, `battery_health_pct`, `design_capacity_raw`, `full_charge_capacity_raw` |
| `fact_environment_telemetry`| ESP32 / sensor events| `temperature_c`, `humidity_percent` |

> **Note on Timestamp Alignment:** PC telemetry clients and ESP32 microcontrollers transmit metrics on independent intervals. Queries never perform strict timestamp equality joins between fact tables; each metric series is queried and downsampled independently.

---

## Rules-Based Alerts (V1)

Alerts are dynamically evaluated by `AlertEngine` against active telemetry:
- **Device Offline:** No events recorded across any fact table for > 3 minutes.
- **CPU Utilization:** Sustained load > 85% across recent telemetry window.
- **RAM Utilization:** Memory usage > 90%.
- **Disk Space:** Utilization > 90%.
- **Ambient Temperature:** ESP32 sensor detecting > 35°C.
- **Battery & Health:** Battery charge < 20% or battery health < 60%.

Alerts can be acknowledged directly from the Alerts page via `POST /api/alerts/{id}/acknowledge`.
