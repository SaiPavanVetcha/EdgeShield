# EdgeShield Web Monitoring & Analytics Dashboard

> **Full-stack telemetry observability dashboard and REST API for EdgeShield.**  
> For the complete system architecture, data pipeline, and hardware clients, see the [Root README](../README.md).

This directory contains the full-stack web application for EdgeShield, providing real-time and historical monitoring across connected PCs, embedded nodes, and ESP32 microcontrollers. The system reads directly from the Databricks Lakehouse Gold Layer (`edgeshield_lakehouse.gold`) and delivers interactive visual telemetry.

---

## Directory Overview

* **[`backend/`](backend/)**: FastAPI analytical service that queries Databricks SQL, enforces in-memory fallback caching, handles SQL warehouse auto-stop/wake-up cycles, and evaluates alert heuristics.
* **[`frontend/`](frontend/)**: React 18 + Vite + TypeScript + Tailwind CSS dashboard with responsive Recharts time-series visualizations and fleet-wide vs. per-device drilldown.

---

## Quickstart Guide

### 1. Run the Backend API
```bash
# Navigate to backend
cd backend

# Create .env from template
cp .env.example .env

# Configure your Databricks workspace credentials in .env:
# DATABRICKS_HOST, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN
# DATABRICKS_CATALOG=edgeshield_lakehouse, DATABRICKS_SCHEMA=gold

# Install dependencies
pip install -r requirements.txt

# Start backend server on port 8000
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Run the Frontend UI
```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install Node dependencies (Node.js 18+)
npm install

# Start development server on port 5173
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite dev server automatically proxies `/api` calls to `http://localhost:8000`.

---

## Configuration & Environment Variables

The frontend works out of the box with default Vite proxying. The backend requires Databricks credentials in `web/backend/.env`:

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

---

## Key Architectural Highlights

### Databricks Free Tier Auto-Stop Resiliency
Databricks Free Tier and Serverless SQL Warehouses automatically power down after 10–15 minutes of idle time to conserve compute credits. EdgeShield handles this seamlessly:
1. **State Classification:** Connector exceptions are classified in real time as `online`, `starting`, `stopped`, or `unconfigured`.
2. **In-Memory Fallback Cache:** Successful queries are cached in memory for 3 minutes (`CACHE_TTL_SECONDS`). If the warehouse is sleeping or times out, the backend serves the last known good telemetry with an `is_cached: true` flag to prevent UI errors.
3. **One-Click Wake-Up Button:** If the warehouse is sleeping, an amber banner appears in the dashboard with a **"Wake Up Warehouse"** button. Clicking it triggers `POST /api/health/wake-up`, which dispatches an asynchronous ping (`SELECT 1`) to initiate compute spin-up while the frontend automatically polls until online.

### Gold Layer Star Schema Queried
All analytical queries target the Gold layer star schema in `edgeshield_lakehouse.gold`:
* `dim_device`: Device dimension (`device_key`, `device_id`, `hostname`, `platform`, `logical_cores`, `physical_cores`).
* `fact_cpu_telemetry`: CPU utilization and core frequencies.
* `fact_ram_telemetry`: RAM utilization, used, and available capacity.
* `fact_disk_telemetry`: Mount-point storage utilization and free gigabytes.
* `fact_battery_telemetry`: Battery percentage, power plugged state, and battery health degradation percentage.
* `fact_environment_telemetry`: ESP32 ambient temperature (°C) and relative humidity (%).

### Heuristic Alert Thresholds
The backend dynamically evaluates heuristic rules against recent telemetry:
* **Device Offline:** No telemetry recorded across fact tables for > 3 minutes.
* **CPU Utilization:** Sustained load > 85% in recent telemetry window.
* **RAM Utilization:** Memory usage > 90%.
* **Disk Space:** Storage utilization > 90%.
* **Ambient Temperature:** ESP32 sensor detecting > 35°C.
* **Battery & Health:** Battery charge < 20% or battery health < 60%.

Alerts can be reviewed and acknowledged directly in the dashboard UI (`POST /api/alerts/{id}/acknowledge`).
