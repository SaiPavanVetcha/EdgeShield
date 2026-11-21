# EdgeShield Medallion Lakehouse Pipeline

> **Delta Live Tables (DLT) & Databricks Lakehouse transformations for EdgeShield telemetry.**  
> For the overall system architecture, see the [Root README](../README.md).

The EdgeShield Lakehouse pipeline transforms high-frequency edge hardware and environmental telemetry across a three-tier Databricks Medallion architecture (Bronze $\to$ Silver $\to$ Gold star schema).

---

## Architecture Overview

```
 [Edge Ingestion: edgeshield_db]
       │ (Delta Lake landing tables)
       ▼
 [Bronze Layer: edgeshield_lakehouse.bronze]
       │ - Raw append streaming ingestion
       │ - Ingest audit timestamps (_ingested_at)
       ▼
 [Silver Layer: edgeshield_lakehouse.silver]
       │ - Data quality expectations (@dp.expect_or_drop)
       │ - Deduplication & SCD Type 1 upserts (dp.apply_changes)
       │ - Null-safe metric cleaning & room normalization
       ▼
 [Gold Layer: edgeshield_lakehouse.gold]
       │ - Materialized device dimension: dim_device (with physical room)
       │ - Fact streaming tables: fact_cpu_telemetry, fact_ram_telemetry,
       │   fact_disk_telemetry, fact_battery_telemetry, fact_environment_telemetry
```

---

## Directory Layout

* **[`ddl/`](ddl/)**: Databricks SQL notebooks for catalog and table provisioning:
  * [`ddl_edgeshield_db.ipynb`](ddl/ddl_edgeshield_db.ipynb): DDL for ingestion database (`edgeshield_db`).
  * [`ddl_edgeshield_lakehouse.ipynb`](ddl/ddl_edgeshield_lakehouse.ipynb): DDL for Lakehouse catalog (`edgeshield_lakehouse`), schemas (`bronze`, `silver`, `gold`), and table definitions.
* **[`transformations/`](transformations/)**: Delta Live Tables pipeline source code:
  * [`bronze/ingest_bronze.py`](transformations/bronze/ingest_bronze.py): Raw streaming ingestion from `edgeshield_db` to `bronze`.
  * [`silver/clean_silver.py`](transformations/silver/clean_silver.py): Quality expectations, deduplication, and room string cleaning.
  * [`gold/aggregate_gold.py`](transformations/gold/aggregate_gold.py): Materialized device dimension (`dim_device`) and analytical fact tables.

---

## Gold Dimension Schema: `dim_device`

The `dim_device` table is a materialized view (`@dp.materialized_view`) providing the central device dimension for analytics and dashboard filtering:

| Column Name | Data Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| **`device_key`** | `STRING` (MD5) | No | Surrogate key generated from `MD5(device_id)` |
| **`device_id`** | `STRING` | No | Natural unique device identifier (e.g. `PC-WORKSTATION-01`) |
| **`hostname`** | `STRING` | Yes | Endpoint hostname (e.g. `workstation-alpha`, `esp32-dht11-node`) |
| **`room`** | `STRING` | Yes | Physical location tag (e.g. `Lab-101`, `Server-Room`) |
| **`platform`** | `STRING` | Yes | Operating system or hardware platform (`Windows`, `Linux`, `Darwin`, `ESP32`) |
| **`logical_cores`** | `INT` | Yes | Number of logical CPU cores (null for microcontrollers) |
| **`physical_cores`**| `INT` | Yes | Number of physical CPU cores (null for microcontrollers) |
| **`last_boot_time_utc`** | `TIMESTAMP` | Yes | System boot timestamp from latest system telemetry |
| **`_updated_at`** | `TIMESTAMP` | No | Timestamp when the materialized view was computed |

### Room Resolution Logic
`dim_device` computes the `room` attribute using a window function partitioned by `device_id` and ordered by `timestamp DESC`:
1. Filters exclusively for non-null and non-empty room entries: `col("room").isNotNull() & (trim(col("room")) != "")`.
2. Selects the most recent non-null room per device (`rn = 1`).
3. Left-joins back to the latest device metadata.
4. **Behavior:** If a device previously transmitted a room (e.g., `Lab-101`) and subsequently sends a packet with an empty or omitted room, `dim_device` **preserves** the latest known room assignment rather than reverting to `NULL`.

---

## Migration Guide for Existing Databricks Workspaces

If your Databricks workspace was provisioned before v1.1 room metadata was introduced, follow these steps to upgrade your schema and recompute Gold:

### Step 1: Apply DDL Alterations
Open a Databricks SQL Warehouse or Notebook and execute:

```sql
-- 1. Ingestion landing table
ALTER TABLE edgeshield_db.system_metrics ADD COLUMN IF NOT EXISTS room STRING;

-- 2. Bronze lakehouse table
ALTER TABLE edgeshield_lakehouse.bronze.system_metrics ADD COLUMN IF NOT EXISTS room STRING;

-- 3. Silver lakehouse table (if schema was explicitly declared)
ALTER TABLE edgeshield_lakehouse.silver.cleaned_system_metrics ADD COLUMN IF NOT EXISTS room STRING;

-- 4. Gold dimension table (if existing)
ALTER TABLE edgeshield_lakehouse.gold.dim_device ADD COLUMN IF NOT EXISTS room STRING;
```

### Step 2: Full Refresh of DLT Pipeline
In Delta Live Tables, materialized views automatically adapt when the underlying query definition changes:
1. In the Databricks UI, navigate to **Workflows $\to$ Delta Live Tables**.
2. Select the **EdgeShield Pipeline**.
3. Click the dropdown next to **Start** and select **Full Refresh** (or click on table `dim_device` and select **Refresh Selected**).
4. DLT will drop and recreate `edgeshield_lakehouse.gold.dim_device` with the new `room` column and populate it from the latest available Silver telemetry.

> [!NOTE]
> **Historical Telemetry Behavior:**  
> Records ingested prior to v1.1 will have `room = NULL`. As edge clients and ESP32 nodes transmit updated payloads containing `room`, the next DLT update will automatically populate the room assignment for those devices. Rebuilding the lakehouse is optional and non-destructive.
