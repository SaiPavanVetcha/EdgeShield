# EdgeShield Central Ingestion Server & Server Console

> **High-throughput FastAPI ingestion service with durable SQLite spooling, dual storage modes, and operational Server Console.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The Central Ingestion Server receives real-time telemetry payloads over HTTP from edge devices (PC clients and ESP32 microcontrollers). It commits incoming payloads immediately to a local SQLite durable spool (`spool/server_spool.db`) to return rapid sub-10ms `HTTP 200` responses. A background worker flushes batches into Databricks SQL landing tables with app-level all-or-nothing spool deletion guarantees, or operates in local mode for zero-cloud pilot testing.

---

## Architectural Highlights

1. **Durable Local Spooling (`server_spool.db`):** Inbound telemetry is durably committed to SQLite before cloud transmission. Network partitions or Databricks outages never drop edge data.
2. **App-Level All-or-Nothing Cloud Ingest:** Multi-table inserts (system, CPU, RAM, disk, battery, environment) for a single payload are executed against Databricks landing tables. Note: workspace and Hive metastore landing tables (`edgeshield_db.*`) are non-catalog-managed and do not support multi-statement SQL transactions (`TRANSACTION_NOT_SUPPORTED.WRITE_NON_CATALOG_MANAGED_TABLE`). Durability is guaranteed at the application level: a spool record is deleted from local disk **only if every insert for that payload succeeds**. On any failure, the spool row is retained for automatic retry.
3. **Dual Storage Modes (`local` vs. `databricks`):**
   - **`local` Mode:** Telemetry is durably spooled on disk and tracked in the in-memory device registry without connecting to Databricks. Enables instant local pilot testing without cloud accounts or credentials.
   - **`databricks` Mode:** Spooled records are flushed periodically to the Databricks Lakehouse landing tables.
   - Storage mode can be switched dynamically at runtime via the Server Console or REST API (`POST /api/console/storage-mode`).
4. **Server Console Control Plane:** Built-in web operations interface accessible at `http://<SERVER_IP>:5000/console` featuring tabbed views for system overview, connected devices, spool metrics, manual flush triggers, and live logs.
5. **Physical Room Dimension:** Ingests top-level `room` metadata from payloads, stores it in `edgeshield_db.system_metrics`, and feeds the Gold layer `dim_device` location dimension.

---

## Requirements

* **Python:** 3.11+
* **Dependencies:** `fastapi`, `uvicorn`, `databricks-sql-connector`, `pydantic`, `python-dotenv` (see [`requirements.txt`](requirements.txt))
* **Databricks (Optional for Local Mode, Required for Cloud Mode):** Active SQL Warehouse with `edgeshield_db` schema

---

## Setup & Execution

### 1. Install Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)
Copy the environment template:
```bash
cp .env.example .env
```

Configure parameters in `.env`:
```ini
HOST=0.0.0.0
PORT=5000

# Storage Mode: "local" (no cloud required) or "databricks"
STORAGE_MODE=databricks

# Databricks SQL Warehouse (Required if STORAGE_MODE=databricks)
DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
DATABRICKS_TOKEN=dapi_your_personal_access_token_here

# Durable Spool & Batching Settings
SPOOL_DIR=./spool
FLUSH_INTERVAL_SECONDS=5.0
FLUSH_MAX_RECORDS=20
SPOOL_MAX_RECORDS=10000
```

### 3. Start the Server
```bash
python server.py
```
The service will start listening on `http://0.0.0.0:5000`.

---

## Server Console & Operations UI (React + Vite)

The Central Ingestion Server includes a dedicated, dark ops control plane interface built with **Vite, React, and TypeScript** in [`server/console-ui/`](console-ui/):

* **Landing Page (`http://localhost:5000/`):** Clean product-level entry point with operational status pills (Server online, Spool pending, Online/total devices, Storage mode), system bind information, and direct CTA to open the console.
* **Operational Console (`http://localhost:5000/console`):** React SPA served directly by FastAPI from `server/static/console/`:
  * **Overview Tab:** System host/port, server uptime, runtime storage mode switcher (instant toggle between `local` and `databricks`), spool buffer status, connected device counts, and last cloud flush diagnostics.
  * **Devices Tab:** Live table of all registered edge nodes (Device ID, hostname, telemetry type, OS platform, physical room badge with "Unassigned" fallback, client IP, last seen relative/absolute timestamp, payload counts, and online/offline status).
  * **Spool Tab:** SQLite queue metrics, capacity utilization bar, batching parameters, and a **"Flush Now"** manual trigger button with detailed outcome reporting.
  * **Logs Tab:** Live auto-refreshing terminal-style log tail streaming from the server's in-memory ring buffer with level filtering (`INFO`, `WARNING`, `ERROR`), text search, and auto-scroll.

### UI Development & Build Workflow

The React console source code lives in [`server/console-ui/`](console-ui/) and compiles to static assets served by FastAPI at `server/static/console/`:

1. **Development Server (Hot Reload + Proxy):**
   ```bash
   cd server/console-ui
   npm run dev
   ```
   Starts Vite on `http://localhost:5174/console/` with automatic API proxying to FastAPI backend on `http://localhost:5000`.

2. **Production Build:**
   ```bash
   cd server/console-ui
   npm run build
   ```
   Outputs minified assets directly to [`server/static/console/`](static/console/).

3. **Production Serving:**
   ```bash
   cd server
   python server.py
   ```
   FastAPI mounts `/console/assets` and serves the compiled single-page application at `/console` while preserving all JSON APIs under `/api/console/*`. (If assets are not yet built, it automatically falls back to an embedded lightweight HTML view).

---

## Interactive Demo Click-Path

Follow this step-by-step path to demonstrate the Server Console capabilities:

1. **Landing Entry (`GET /`):** Navigate to `http://localhost:5000`. Review the live operational status pills (Server Online, Spool Pending, Active Devices, and Storage Mode). Click **"Open Ops Console"**.
2. **Console Overview (`GET /console`):** Review the 6-card metrics grid (Uptime, Storage Mode, Spool Pending, Devices Online/Total, Last Flush Status, Databricks Credentials Configured).
3. **Mode Toggle:** In the **Storage Mode Control Plane** card, click **"Switch to Local Mode"** (or Databricks). Observe the runtime mode switch instantly without wiping spooled records.
4. **Devices Registry:** Click the **Devices** tab. Inspect connected edge endpoints, filter by search or online/offline status, and observe physical room tags (e.g. `Lab-101` or `Unassigned`).
5. **Spool Management & Manual Flush:** Switch to the **Spool Queue** tab. Review pending records and queue capacity limits. Click **"Flush Now"** to trigger an immediate flush cycle and observe the detailed success banner.
6. **Live Terminal Logs:** Click the **Logs** tab. Enable **Live Stream** to watch real-time server logs, filter by level (`INFO`, `WARNING`, `ERROR`), or search for specific device IDs.

---

## Local Pilot Mode (Zero Cloud Setup)

To run a standalone pilot without configuring Databricks:

1. In `.env`, set `STORAGE_MODE=local` (or toggle to Local in the Server Console).
2. Start the server: `python server.py`.
3. Open `http://localhost:5000/console` to confirm `Storage Mode: Local`.
4. Point client agents (`client/client.py`) to `http://localhost:5000/metrics`.
5. Observe incoming endpoints populate the **Devices** tab and records buffer in the **Spool** tab.
6. When ready to connect to cloud, configure Databricks credentials and switch the mode to `databricks` via the console. Existing spooled records will flush to Databricks automatically.

---

## REST API Reference

### Telemetry Ingestion
* **`POST /metrics`**  
  Ingests a hardware telemetry payload. Returns `HTTP 200` once safely committed to local spool:
  ```json
  {
    "device_id": "PC-LAB-01",
    "hostname": "workstation-alpha",
    "room": "Lab-101",
    "timestamp": "2026-11-20T10:00:00Z",
    "metrics": {
      "system": { "platform": "Windows", "uptime_seconds": 86400 },
      "cpu": { "cpu_utilization_pct": 24.5 },
      "ram": { "ram_utilization_pct": 58.2 },
      "disk": { "disk_utilization_pct": 68.0 },
      "battery": { "present": true, "battery_pct": 92.0, "power_plugged": true }
    }
  }
  ```

### Health & Console APIs
* **`GET /`** — Landing page HTML (or JSON if `Accept: application/json` is passed).
* **`GET /console`** — Tabbed Server Console HTML.
* **`GET /api/console/status`** — System status, uptime, storage mode, spool counts, online device metrics.
* **`GET /api/console/devices`** — Device registry array sorted by `last_seen_utc` descending.
* **`POST /api/console/storage-mode`** — Updates storage mode (`{"mode": "local" | "databricks"}`).
* **`POST /api/console/flush`** — Triggers an immediate spool flush cycle.
* **`GET /api/console/logs`** — Returns recent server log entries from the in-memory ring buffer.

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `HOST` | No | `0.0.0.0` | IP address to bind the server socket |
| `PORT` | No | `5000` | Ingestion server listening port |
| `STORAGE_MODE` | No | `databricks` | Storage mode: `local` or `databricks` |
| `DATABRICKS_HOST` | Conditional | — | Workspace host (required if `STORAGE_MODE=databricks`) |
| `DATABRICKS_HTTP_PATH` | Conditional | — | SQL Warehouse HTTP path |
| `DATABRICKS_TOKEN` | Conditional | — | Databricks Personal Access Token |
| `SPOOL_DIR` | No | `server/spool` | Directory path where `server_spool.db` is stored |
| `FLUSH_INTERVAL_SECONDS` | No | `5.0` | Interval between Databricks flush attempts (seconds) |
| `FLUSH_MAX_RECORDS` | No | `20` | Batch size threshold that triggers an immediate flush |
| `SPOOL_MAX_RECORDS` | No | `10000` | Maximum durable spool capacity before trimming oldest records |

---

## Schema & Room Migration

The ingestion server records location metadata via the `room` column:
* **Ingestion Table:** `edgeshield_db.system_metrics`
* **Bronze Lakehouse Table:** `edgeshield_lakehouse.bronze.system_metrics`

If upgrading an existing Databricks deployment, apply these DDL statements in a Databricks SQL notebook:
```sql
ALTER TABLE edgeshield_db.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
ALTER TABLE edgeshield_lakehouse.bronze.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
```

Fresh Lakehouse deployments using `edgeshield_etl_pipeline/ddl/` already include `room STRING`.
