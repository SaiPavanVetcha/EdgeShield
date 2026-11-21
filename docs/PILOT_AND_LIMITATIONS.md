# EdgeShield Pilot Deployment & Technical Limitations Brief

> **Confidential / Engineering Evaluation Brief**  
> **Target Audience:** Technical evaluators, enterprise architects, and pilot reviewers.  
> **Platform Version:** v1.1 Hardening  
> **Repository:** [EdgeShield](https://github.com/your-org/edgeshield)

---

## 1. Executive Summary

EdgeShield is an edge-to-lakehouse observability platform designed to monitor heterogeneous compute nodes — including desktop workstations, mobile laptops, embedded Linux units, and microcontrollers (ESP32) — by streaming hardware and environmental telemetry into a Databricks Medallion Lakehouse architecture.

This document provides a concise, transparent overview of EdgeShield's operational capabilities, architectural boundaries, and known limitations during pilot and proof-of-concept (PoC) deployments.

---

## 2. Verified v1.1 Production Hardening Capabilities

The `feature/v1.1-hardening` release introduces enterprise-grade resilience, operational control, and data integrity enhancements:

1. **Dual-Tier Durable Spooling:**
   - **Edge Client Spool:** Both network timeouts and server downtime are buffered locally in an embedded SQLite queue (`telemetry_spool.db`). Records are drained in FIFO order upon reconnection.
   - **Ingestion Server Spool:** Inbound HTTP payloads are committed immediately to local SQLite (`server_spool.db`), returning sub-10ms `HTTP 200` to edge nodes before cloud synchronization occurs.
2. **Transactional All-or-Nothing Cloud Ingestion:**
   - Server-to-Databricks batch flushes wrap multi-table payload inserts (system, CPU, RAM, disk, battery, environment) in a single database transaction.
   - A spool record is deleted if and only if the full transaction commits successfully. On connection failure or database abort, the payload remains intact in the spool for automatic retry.
3. **Dual Storage Modes (Local Pilot vs. Databricks Lakehouse):**
   - The server features a runtime storage mode switcher (`local` vs. `databricks`) managed via the Server Console or REST API (`POST /api/console/storage-mode`).
   - In `local` mode, telemetry is durably spooled and tracked in the in-memory device registry without requiring any Databricks credentials, enabling immediate zero-cloud local pilots.
4. **Physical Location Dimension (Room Segmentation):**
   - End-to-end location tagging (`ROOM` environment variable on clients) flows through ingestion, landing tables, Silver cleaning, and into the Gold `dim_device` dimension.
   - The web dashboard supports dynamic room filtering to isolate telemetry by laboratory, server room, or building floor.
5. **Battery Capability Gating:**
   - Hardware detection differentiates portable systems (laptops) from stationary hardware (desktops, servers).
   - Systems with `battery.present = false` pass safe null metrics. The web dashboard dynamically suppresses battery KPI cards and "Power & Battery" charts for non-battery devices, eliminating false-positive low-battery alerts.
6. **SQL Injection Defense & Parameterized Analytics:**
   - Web backend Gold queries strictly parameterize all dynamic values (`:device_id`, `:device_key`, `:room`, `:from_ts`, `:to_ts`, `:window_ts`).
   - Structural elements (metric tables, column expressions, date truncation grains) are strictly allowlisted via immutable static maps; raw user input is never concatenated into SQL text.
7. **Server Console Control Plane:**
   - Embedded operational interface at `http://<SERVER_IP>:5000/console` providing real-time device discovery, spool metrics, manual flush triggers, storage mode toggling, and log tailing.

---

## 3. Operational Boundaries & Known Limitations

To ensure smooth evaluation, reviewers should account for the following current design boundaries:

### 3.1 Authentication & Multi-Tenancy (Planned for v2)
* **Current State:** Edge clients transmit unauthenticated HTTP JSON payloads to `POST /metrics`. The Web Dashboard and Server Console do not enforce user login or role-based access control (RBAC).
* **Pilot Recommendation:** Pilots should operate within a secure corporate LAN, lab VLAN, or behind an authenticating reverse proxy (e.g., NGINX, Caddy, or Cloudflare Tunnel with Basic Auth / OAuth2).
* **Roadmap:** Mutual TLS (mTLS) or per-device shared tokens (`X-Device-Token`) and JWT-based dashboard authentication are scheduled for v2.

### 3.2 Databricks Free Tier & Serverless SQL Cold Starts
* **Current State:** On Databricks Free Tier or auto-stop Serverless SQL Warehouses (configured to stop after 10–15 minutes of idle time), initial queries after sleep take 15–45 seconds while compute clusters spin up.
* **Mitigation Built In:** The Web Backend features an in-memory query cache (3-minute TTL) to serve the last known good telemetry with an `is_cached: true` flag, and displays a prominent **"Wake Up Warehouse"** button (`POST /api/health/wake-up`) to trigger non-blocking spin-up.

### 3.3 Ephemeral State & In-Memory Elements
* **Server Device Registry:** The active device list on the Ingestion Server (`GET /api/console/devices`) resides in server process memory and is rebuilt dynamically as devices transmit telemetry.
* **Alert Acknowledgments:** Alert acknowledgments in the Web Dashboard are held in backend memory. Restarting the backend process clears acknowledgment flags until persisted in a Delta table (scheduled for v2).
* **Room-Scoped Alert Rules (In Progress):** The alert engine currently evaluates heuristic rules across fleet-wide recent telemetry. Dynamic room filtering on active alerts is currently in progress.

### 3.4 Lakehouse Deployment & Room Dimension Support
* **Fresh Deployments (Primary Path):** For new Databricks workspaces, run `edgeshield_etl_pipeline/ddl/ddl_edgeshield_db.ipynb` to initialize the landing database and `ddl_edgeshield_lakehouse.ipynb` to initialize the catalog and schemas. Delta Live Tables (DLT) automatically creates and manages all Bronze streaming tables, Silver cleaned tables, and the Gold `dim_device` dimension with `room STRING` built-in upon pipeline startup. See [`edgeshield_etl_pipeline/README.md`](../edgeshield_etl_pipeline/README.md) for the 3-step setup checklist.
* **Pre-existing Legacy Workspaces (Secondary Migration Path):** If targeting an existing workspace without dropping old tables, administrators can apply these schema alterations:
  ```sql
  ALTER TABLE edgeshield_db.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
  ALTER TABLE edgeshield_lakehouse.bronze.system_metrics ADD COLUMN IF NOT EXISTS room STRING;
  ```
  If unmigrated, the server automatically falls back to omitting `room` to prevent batch ingestion failures.
* **Full Refresh / Recomputing Gold `dim_device`:**
  - In the Databricks UI under **Delta Live Tables $\to$ Pipelines**, trigger a **Full Refresh** on the pipeline (or click on `dim_device` and select **Refresh Selected**).
  - Because `dim_device` is defined as a materialized view (`@dp.materialized_view`), a pipeline refresh automatically recalculates the view with the new `room` column from Silver telemetry without manual `UPDATE` statements.
  - **Historical Telemetry:** Any legacy records ingested without room will carry `room = NULL`. As soon as endpoints transmit updated payloads containing `room`, the latest non-null room assignment is attributed to `dim_device` for that device. Complete lakehouse rebuilds are optional and safe.

---

## 4. Pilot Evaluation Runbook

For a comprehensive 15-minute evaluation without cloud dependencies:

1. **Launch Server in Local Mode:**
   ```bash
   cd server
   python server.py
   ```
   Open `http://localhost:5000/console` to inspect the Server Console in `local` storage mode.
2. **Start One Laptop & One Desktop Client:**
   ```bash
   # Terminal A: Laptop simulation (with room tag)
   cd client
   ROOM=Lab-101 python client.py

   # Terminal B: Desktop simulation (different room)
   cd client
   ROOM=Server-Room DEVICE_ID=DESKTOP-SRV-01 python client.py
   ```
3. **Verify Operational Behaviors:**
   - Check `http://localhost:5000/console`: Confirm both devices appear under the **Devices** tab with distinct rooms and active status.
   - Inspect the **Spool** tab: Observe incoming records buffered locally.
   - If connected to Databricks, switch mode to `databricks` and trigger **Flush Now** to verify atomic batch commit.
4. **Launch Web Dashboard (requires Databricks Gold tables):**
   ```bash
   # Web Backend
   cd web/backend && uvicorn app.main:app --port 8000

   # Web Frontend
   cd web/frontend && npm run dev
   ```
   Open `http://localhost:5173` to test room filtering, "All" time-range preset, and desktop battery suppression.

---

## 5. Contact & Support

For architecture questions, pilot staging assistance, or enterprise feature requests, contact the EdgeShield core engineering team or open an issue on the project repository.
