# EdgeShield Central Ingestion Server

> **High-throughput FastAPI ingestion service with durable SQLite spooling and Databricks SQL batching.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The Central Ingestion Server receives real-time telemetry payloads over HTTP from edge devices (PC clients and ESP32 microcontrollers). It commits incoming payloads immediately to a local SQLite durable spool (`spool/server_spool.db`) to return rapid sub-10ms `200 OK` responses. A background worker thread flushes batches of records into Databricks SQL landing tables, ensuring zero telemetry loss during process restarts or Databricks outages.

---

## Requirements

* **Python:** 3.11+ (standard library SQLite3 used for spooling)
* **Databricks:** Active SQL Warehouse (Free Tier Serverless, Pro, or Classic) with `edgeshield_db` schema
* **Dependencies:** `fastapi`, `uvicorn`, `databricks-sql-connector`, `pydantic`, `python-dotenv` (specified in [`requirements.txt`](requirements.txt))

---

## Setup & Execution

1. **Install dependencies:**
   From the `server` directory (inside your virtual environment):
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Populate your Databricks SQL Warehouse connection details and spooling parameters:
   ```ini
   HOST=0.0.0.0
   PORT=5000

   DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
   DATABRICKS_TOKEN=dapi_your_personal_access_token_here

   # Durable Spool & Batching Settings
   SPOOL_DIR=./spool
   FLUSH_INTERVAL_SECONDS=5.0
   FLUSH_MAX_RECORDS=20
   SPOOL_MAX_RECORDS=10000
   ```

3. **Start the server:**
   ```bash
   python server.py
   ```
   The server will start listening on `http://0.0.0.0:5000` with auto-reloading enabled.

---

## Durable Ingestion & Databricks Outage Resiliency

The server decouples edge payload reception from cloud warehouse writes:

1. **Durability First:** `POST /metrics` validates `device_id` and immediately commits the payload to the local SQLite database (`server_spool.db`). Control is returned to the client in `< 5ms` with `HTTP 200`.
2. **Batch Flushes:** The background flush worker opens a single pooled Databricks SQL connection and flushes records when:
   * `FLUSH_INTERVAL_SECONDS` elapses (default: 5.0s), **OR**
   * Total pending records reach `FLUSH_MAX_RECORDS` (default: 20 records).
3. **Atomic Deletion & Retry:** Records are only deleted from the SQLite spool once successfully inserted into Databricks. If the warehouse is auto-stopped, sleeping, or temporarily unreachable, the worker logs the error, leaves all unwritten records in the spool, and retries on the next flush cycle.
4. **Crash Recovery on Startup:** Whenever the server process boots, it scans the spool for pending records from prior runs and attempts an immediate flush before starting the background loop.
5. **Retention Protection:** If the spool reaches `SPOOL_MAX_RECORDS` (default: 10000), the oldest records are trimmed to protect host storage and a warning is logged.

> [!NOTE]
> **Spool Directory Location:** By default, the local SQLite spool lives under `server/spool/` (`server_spool.db`), resolved relative to the server package directory (`BASE_DIR`). This guarantees the spool database is always created inside the server folder regardless of your process current working directory.

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `HOST` | No | `0.0.0.0` | IP address to bind the server socket |
| `PORT` | No | `5000` | Ingestion server listening port |
| `DATABRICKS_HOST` | **Yes** | — | Databricks workspace host (e.g., `dbc-xxxx.cloud.databricks.com`) |
| `DATABRICKS_HTTP_PATH` | **Yes** | — | SQL Warehouse HTTP path (`/sql/1.0/warehouses/xxxx`) |
| `DATABRICKS_TOKEN` | **Yes** | — | Databricks Personal Access Token (`dapi...`) |
| `SPOOL_DIR` | No | `server/spool` | Directory path where `server_spool.db` is stored (default: `server/spool` relative to server package) |
| `FLUSH_INTERVAL_SECONDS` | No | `5.0` | Interval between Databricks flush attempts (seconds) |
| `FLUSH_MAX_RECORDS` | No | `20` | Batch size threshold that triggers an immediate flush |
| `SPOOL_MAX_RECORDS` | No | `10000` | Maximum durable spool capacity before trimming oldest records |

---

## Endpoints & Health Check

* **Health Check & Spool Status:**
  ```http
  GET /
  ```
  Returns server health, pending spool queue count, and last flush status:
  ```json
  {
    "status": "online",
    "system": "EdgeShield Server Backend",
    "spool": {
      "pending": 0,
      "max_records": 10000,
      "flush_interval_seconds": 5.0,
      "flush_max_records": 20,
      "last_flush": {
        "timestamp": "2026-11-18T12:00:00+00:00",
        "inserted": 20,
        "failed": 0,
        "success": true
      }
    }
  }
  ```

* **Telemetry Ingestion:**
  ```http
  POST /metrics
  ```
  Receives JSON telemetry payloads containing `device_id`, optional `room`, and hardware `metrics`. Durably enqueues payload to local SQLite spool and returns `HTTP 200` immediately:
  ```json
  {
    "status": "success",
    "message": "Telemetry spooled for Databricks persistence",
    "device_id": "PC-WORKSTATION-01",
    "room": "Lab-A"
  }
  ```

---

## Schema & Lakehouse Migration (Room Metadata Support)

The ingestion server and Lakehouse pipeline support end-to-end telemetry location tracking via the `room` column:
* **Payload Reception:** The ingestion server receives client JSON payloads containing top-level `"room"` (e.g. `"Lab-A"`). Empty or whitespace-only strings are automatically normalized to `NULL`.
* **Database Ingestion:** The background flush worker writes `room` into `edgeshield_db.system_metrics`. If targeting an unmigrated table where the column is missing, it automatically falls back to omitting `room` to prevent batch failure.
* **Lakehouse Pipeline:** Bronze streams `room` into Silver (`cleaned_system_metrics`), and Gold computes the latest non-null room per device in `dim_device`.

### Applying DDL Migration to Existing Databricks Environments

If your Databricks workspace was initialized with an earlier schema version, apply these DDL migration statements to add the nullable `room STRING` column:

```sql
-- 1. Ingestion landing table (edgeshield_db)
ALTER TABLE edgeshield_db.system_metrics ADD COLUMN IF NOT EXISTS room STRING;

-- 2. Bronze lakehouse table (edgeshield_lakehouse)
ALTER TABLE edgeshield_lakehouse.bronze.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
```

Fresh Lakehouse deployments using `edgeshield_etl_pipeline/ddl/ddl_edgeshield_db.ipynb` and `ddl_edgeshield_lakehouse.ipynb` already include `room STRING` in `system_metrics`.
