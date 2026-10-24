# EdgeShield Telemetry Backend

FastAPI-powered telemetry service querying the Databricks Lakehouse Gold layer (`edgeshield_lakehouse.gold`).

## Requirements
- Python 3.11+
- Databricks SQL Warehouse (Free Tier Serverless or Pro)

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Databricks credentials:
   ```ini
   DATABRICKS_HOST=dbc-xxxxxxxx-xxxx.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
   DATABRICKS_TOKEN=dapi_your_token_here
   DATABRICKS_CATALOG=edgeshield_lakehouse
   DATABRICKS_SCHEMA=gold
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Or run directly:
   ```bash
   python -m app.main
   ```

5. Open API Docs:
   - Interactive Swagger UI: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/api/health`

## Databricks Free Tier Auto-Stop Resiliency
Databricks Free Tier SQL Warehouses automatically stop after a period of inactivity (typically 10-15 minutes).
The backend provides built-in resilience:
- **Automatic State Detection:** Distinguishes between `online`, `starting`, `stopped`, and `error`.
- **In-Memory Query Cache:** Caches successful query responses for up to 3 minutes. If the warehouse is stopped, stale cached data is served seamlessly to prevent UI crashes.
- **Wake-Up Signal:** `POST /api/health/wake-up` transmits a lightweight asynchronous ping (`SELECT 1`) to initiate warehouse spin-up.

## API Endpoints
- `GET /api/devices`: Device catalog from `dim_device` with real-time status and telemetry capabilities.
- `GET /api/kpis?device_id=all|{id}&from=...&to=...`: Key performance indicators (CPU, RAM, Disk, Battery, Temperature, Humidity).
- `GET /api/timeseries?device_id=all|{id}&metric=cpu|ram|disk|battery|temperature|humidity&from=...&to=...`: Time series telemetry for charts.
- `GET /api/alerts`: Active alerts evaluated against rules.
- `POST /api/alerts/{id}/acknowledge`: Mark alert as acknowledged.
- `GET /api/health`: Health status and Databricks warehouse connectivity.
- `POST /api/health/wake-up`: Trigger wake-up sequence for sleeping warehouse.
