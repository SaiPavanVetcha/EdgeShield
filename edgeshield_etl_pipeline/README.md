# EdgeShield Medallion Lakehouse Pipeline & Setup Guide

> **Production Delta Live Tables (DLT) & Databricks Lakehouse Pipeline for EdgeShield.**  
> Built for fresh workspace deployments with first-class physical room and battery capability support.  
> For the overall platform architecture, see the [Root README](../README.md).

---

## 1. DLT-First Architecture & Strategy

In EdgeShield, **Delta Live Tables (DLT) is the sole source of truth** for all lakehouse tables:
* **Landing Database (`edgeshield_db`):** An external Delta database populated by the FastAPI Ingestion Server (`server/database.py`). It is created via the [`ddl/ddl_edgeshield_db.ipynb`](ddl/ddl_edgeshield_db.ipynb) notebook so the server can insert records and Bronze can stream from it.
* **Bronze Layer (`edgeshield_lakehouse.bronze`):** Ingests raw streams from `edgeshield_db.*` and appends `_ingested_at` audit timestamps. Managed entirely by [`transformations/bronze/ingest_bronze.py`](transformations/bronze/ingest_bronze.py).
* **Silver Layer (`edgeshield_lakehouse.silver`):** Cleaned, deduplicated (SCD Type 1) streaming tables with room normalization (`when(trim(col("room")) == "", None)`). Managed entirely by [`transformations/silver/clean_silver.py`](transformations/silver/clean_silver.py).
* **Gold Layer (`edgeshield_lakehouse.gold`):** The analytical star schema. [`transformations/gold/aggregate_gold.py`](transformations/gold/aggregate_gold.py) defines the central `dim_device` materialized view (with latest non-null room attribution) and 5 decoupled fact streaming tables (`fact_cpu_telemetry`, `fact_ram_telemetry`, `fact_disk_telemetry`, `fact_battery_telemetry`, `fact_environment_telemetry`).

> [!IMPORTANT]
> **Do Not Pre-Create Silver or Gold Tables:**  
> DLT creates and manages all Bronze, Silver, and Gold tables automatically upon pipeline startup. You do **not** need to create tables for Silver or Gold manually.

---

## 2. Fresh Workspace Setup (3-Step Order)

Follow this sequence to initialize a brand-new Databricks workspace:

```
Step 1: Run Landing Notebook ───► Step 2: Run Lakehouse Schemas Notebook ───► Step 3: Configure & Start DLT
(edgeshield_db landing tables)     (catalog + bronze/silver/gold schemas)      (DLT creates all lakehouse tables)
```

### Step 1: Run Landing Notebook (`ddl_edgeshield_db.ipynb`)
1. Import and run [`ddl/ddl_edgeshield_db.ipynb`](ddl/ddl_edgeshield_db.ipynb) using a Databricks SQL Warehouse or interactive cluster.
2. Creates the database `edgeshield_db` and the 6 landing tables:
   - `system_metrics` (with `room STRING` built-in)
   - `cpu_metrics`
   - `ram_metrics`
   - `disk_metrics`
   - `battery_metrics`
   - `environment_metrics`

### Step 2: Run Lakehouse Schemas Notebook (`ddl_edgeshield_lakehouse.ipynb`)
1. Import and run [`ddl/ddl_edgeshield_lakehouse.ipynb`](ddl/ddl_edgeshield_lakehouse.ipynb).
2. Initializes the Unity Catalog catalog and the three target schemas:
   ```sql
   CREATE CATALOG IF NOT EXISTS edgeshield_lakehouse;
   USE CATALOG edgeshield_lakehouse;

   CREATE SCHEMA IF NOT EXISTS bronze;
   CREATE SCHEMA IF NOT EXISTS silver;
   CREATE SCHEMA IF NOT EXISTS gold;
   ```
   *(Creates catalog and schemas only; tables are left for DLT to create).*

### Step 3: Configure & Start the DLT Pipeline
1. In the Databricks workspace, navigate to **Workflows $\to$ Delta Live Tables**.
2. Click **Create Pipeline** and configure:
   - **Pipeline Name:** `EdgeShield-Telemetry-Pipeline`
   - **Product Edition:** `Advanced`
   - **Pipeline Mode:** `Triggered` (scheduled batches) or `Continuous` (real-time stream).
   - **Source Code Paths:** Add the three transformation Python files from your repository:
     1. `edgeshield_etl_pipeline/transformations/bronze/ingest_bronze.py`
     2. `edgeshield_etl_pipeline/transformations/silver/clean_silver.py`
     3. `edgeshield_etl_pipeline/transformations/gold/aggregate_gold.py`
   - **Destination:**
     - **Catalog:** `edgeshield_lakehouse`
     - **Target Schema:** `gold`
   - **Cluster Configuration:** Serverless or Single-Node worker.
3. Under **Advanced $\to$ Configuration**, specify catalog mappings:
   ```text
   edgeshield.source_catalog = workspace
   edgeshield.source_schema  = edgeshield_db
   edgeshield.target_catalog = edgeshield_lakehouse
   edgeshield.bronze_schema  = bronze
   edgeshield.silver_schema  = silver
   edgeshield.gold_schema    = gold
   ```
   > [!NOTE]
   > **Source Catalog Account Variations:**  
   > Depending on your Databricks account type and Unity Catalog setup, the source catalog containing `edgeshield_db` may be `workspace` or `hive_metastore` (e.g. `edgeshield.source_catalog = hive_metastore`). Check where `edgeshield_db` was created in your Databricks Catalog Explorer and adjust this setting accordingly.

4. Click **Start**.  
   *DLT compiles the execution graph and automatically provisions all streaming tables in Bronze and Silver, plus `dim_device` and fact tables in Gold.*

---

## 3. Ingestion & Verification

### 1. Point Ingestion Server to Databricks
In `server/.env`, set your SQL Warehouse credentials:
```ini
STORAGE_MODE=databricks
DATABRICKS_HOST=dbc-xxxx.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxxxxxxxxxx
DATABRICKS_TOKEN=dapi_your_token_here
```
Run `python server.py`.

### 2. Transmit Telemetry with Room
* **PC Client:**
  ```bash
  cd client
  ROOM=Lab-101 python client.py
  ```
* **ESP32 Node (or curl test):**
  ```bash
  curl -X POST http://localhost:5000/metrics \
    -H "Content-Type: application/json" \
    -d '{"device_id":"ESP32-ENV-01","hostname":"esp32-node","room":"Server-Room","type":"esp32_telemetry","platform":"ESP32","metrics":{"dht11":{"temperature_c":24.5,"humidity_percent":55.0}}}'
  ```

In the Server Console (`http://localhost:5000/console`), click **Flush Spool Now** (or wait for the background flush).

### 3. Verify in Databricks SQL Editor
Run the DLT pipeline update, then execute:

```sql
-- Verify dim_device has registered the endpoints and their rooms
SELECT 
    device_key,
    device_id,
    hostname,
    room,
    platform,
    logical_cores,
    physical_cores,
    last_boot_time_utc,
    _updated_at
FROM edgeshield_lakehouse.gold.dim_device;

-- Verify fact telemetry is arriving
SELECT * FROM edgeshield_lakehouse.gold.fact_cpu_telemetry ORDER BY event_timestamp DESC LIMIT 10;
SELECT * FROM edgeshield_lakehouse.gold.fact_environment_telemetry ORDER BY event_timestamp DESC LIMIT 10;
```

Expected `dim_device` output:
* PC client appears with `room = 'Lab-101'`, `platform = 'Windows'` (or `Linux`), and populated core counts.
* ESP32 node appears with `room = 'Server-Room'`, `platform = 'ESP32'`, and `null` cores.

---

## 4. Legacy Migration Note (Residual Old Workspaces Only)

For fresh workspaces, no migration is required. If updating a pre-v1.1 workspace where tables were created manually without room, apply:

```sql
ALTER TABLE edgeshield_db.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
ALTER TABLE edgeshield_lakehouse.bronze.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
```
Then trigger a **Full Refresh** of the DLT pipeline to recompute Silver and Gold `dim_device`.
