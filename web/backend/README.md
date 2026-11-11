# EdgeShield Web Backend API

> **FastAPI telemetry query service querying the Databricks Lakehouse Gold layer.**  
> For the web application overview, see the [Web README](../README.md). For overall system architecture, see the [Root README](../../README.md).

This service acts as the analytical query layer for the EdgeShield Web Dashboard. It queries the Gold layer star schema Delta tables in `edgeshield_lakehouse.gold` via the Databricks SQL Connector, provides an in-memory fallback cache with warehouse auto-stop resilience, and evaluates heuristic alert rules.

---

## Requirements

* Python 3.11+
* Databricks SQL Warehouse (Free Tier Serverless, Pro, or Classic)

---

## Development Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   Create `.env` from the template:
   ```bash
   cp .env.example .env
   ```

   Populate your Databricks workspace credentials:
   ```ini
   DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
   DATABRICKS_TOKEN=dapi_your_personal_access_token_here
   DATABRICKS_CATALOG=edgeshield_lakehouse
   DATABRICKS_SCHEMA=gold
   ```

3. **Start the development server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Or run using python module syntax:
   ```bash
   python -m app.main
   ```

4. **Verify installation:**
   * Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   * Warehouse health status: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Configuration Reference

All settings can be configured via environment variables or a `.env` file in this directory:

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABRICKS_HOST` | **Yes** | — | Databricks workspace hostname |
| `DATABRICKS_HTTP_PATH` | **Yes** | — | SQL Warehouse HTTP path |
| `DATABRICKS_TOKEN` | **Yes** | — | Databricks Personal Access Token |
| `DATABRICKS_CATALOG` | No | `edgeshield_lakehouse` | Unity Catalog catalog name |
| `DATABRICKS_SCHEMA` | No | `gold` | Schema containing Gold layer tables |
| `HOST` | No | `0.0.0.0` | Server binding host |
| `PORT` | No | `8000` | Server binding port |
| `CACHE_TTL_SECONDS` | No | `180` | In-memory query cache time-to-live |
| `QUERY_TIMEOUT_SECONDS` | No | `45` | Databricks query execution timeout |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated allowed CORS origins |

---

## Databricks Free Tier Auto-Stop Resiliency

Databricks Free Tier SQL Warehouses automatically stop after 10–15 minutes of inactivity. To keep the dashboard responsive and prevent UI crashes:
* **State Classification:** The service intercepts driver errors and classifies connection health into `online`, `starting`, `stopped`, or `unconfigured`.
* **In-Memory Cache:** Successful queries are cached in memory for up to 3 minutes (`CACHE_TTL_SECONDS`). When a warehouse is asleep, stale cached data is served with `is_cached: true`.
* **Wake-Up Signal:** `POST /api/health/wake-up` sends a lightweight asynchronous ping (`SELECT 1`) to trigger warehouse spin-up in the background without blocking the client.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Warehouse connectivity, status classification, and cache stats |
| `POST` | `/api/health/wake-up` | Trigger asynchronous warehouse wake-up sequence |
| `GET` | `/api/devices` | Device catalog from `dim_device` with status and capabilities |
| `GET` | `/api/kpis` | Aggregate KPIs for CPU, RAM, Disk, Battery, and DHT11 sensors (`device_id=all\|{id}`) |
| `GET` | `/api/timeseries` | Time-series telemetry points for Recharts charts (`metric=cpu\|ram\|disk\|battery\|temperature\|humidity`) |
| `GET` | `/api/alerts` | Active alerts evaluated against heuristic rules |
| `POST` | `/api/alerts/{id}/acknowledge` | Mark an alert as acknowledged |
