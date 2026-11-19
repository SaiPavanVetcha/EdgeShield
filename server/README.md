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

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `HOST` | No | `0.0.0.0` | IP address to bind the server socket |
| `PORT` | No | `5000` | Ingestion server listening port |
| `DATABRICKS_HOST` | **Yes** | — | Databricks workspace host (e.g., `dbc-xxxx.cloud.databricks.com`) |
| `DATABRICKS_HTTP_PATH` | **Yes** | — | SQL Warehouse HTTP path (`/sql/1.0/warehouses/xxxx`) |
| `DATABRICKS_TOKEN` | **Yes** | — | Databricks Personal Access Token (`dapi...`) |
| `SPOOL_DIR` | No | `./spool` | Directory path where `server_spool.db` is stored |
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

## Schema & Lakehouse Migration Note (DDL Gap)

The ingestion server accepts payloads with or without the optional `room` field (backward-compatible). Currently, the `edgeshield_db.system_metrics` landing table schema defines:
```sql
(event_id STRING, device_id STRING, hostname STRING, timestamp TIMESTAMP, platform STRING, boot_time_utc TIMESTAMP)
```
To persist `room` into Databricks when available, apply the following DDL migration to your Lakehouse:
```sql
ALTER TABLE edgeshield_db.system_metrics ADD COLUMN room STRING;
```
Until this migration is applied, the ingestion server safely buffers and processes incoming telemetry while preserving the existing database write contract.
