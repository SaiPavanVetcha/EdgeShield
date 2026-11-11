# EdgeShield Central Ingestion Server

> **High-throughput FastAPI ingestion service buffering telemetry and writing to Databricks SQL.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The Central Ingestion Server receives real-time telemetry payloads over HTTP from edge devices (PC clients and ESP32 microcontrollers). It buffers incoming requests in a thread-safe in-memory queue to return immediate sub-10ms `200 OK` acknowledgments, and a background worker thread flushes batches of metrics into Databricks SQL landing tables.

---

## Requirements

* **Python:** 3.11+
* **Databricks:** Active SQL Warehouse (Free Tier Serverless, Pro, or Classic) with `edgeshield_db` schema
* **Dependencies:** `fastapi`, `uvicorn`, `databricks-sql-connector`, `pydantic`, `python-dotenv` (included in root [`requirements.txt`](../requirements.txt))

---

## Setup & Execution

1. **Install dependencies:**
   From the repository root (or inside your virtual environment):
   ```bash
   pip install -r ../requirements.txt
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Populate your Databricks SQL Warehouse connection details:
   ```ini
   HOST=0.0.0.0
   PORT=5000

   DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
   DATABRICKS_TOKEN=dapi_your_personal_access_token_here
   ```

3. **Start the server:**
   ```bash
   python server.py
   ```
   The server will start listening on `http://0.0.0.0:5000` with auto-reloading enabled.

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `HOST` | No | `0.0.0.0` | IP address to bind the server socket |
| `PORT` | No | `5000` | Ingestion server listening port |
| `DATABRICKS_HOST` | **Yes** | — | Databricks workspace host (e.g., `dbc-xxxx.cloud.databricks.com`) |
| `DATABRICKS_HTTP_PATH` | **Yes** | — | SQL Warehouse HTTP path (`/sql/1.0/warehouses/xxxx`) |
| `DATABRICKS_TOKEN` | **Yes** | — | Databricks Personal Access Token (`dapi...`) |

---

## Endpoints & Health Check

* **Health Check:**
  ```http
  GET /
  ```
  Returns:
  ```json
  {
    "status": "online",
    "system": "EdgeShield Server Backend"
  }
  ```
* **Telemetry Ingestion:**
  ```http
  POST /metrics
  ```
  Receives JSON telemetry payloads containing `device_id` and metrics. Queues data asynchronously and returns HTTP 200 immediately.

