# EdgeShield PC Client Agent

> **Modular Python agent for collecting, durable spooling, and transmitting host hardware telemetry.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The PC Client Agent runs on host workstations, laptops, or embedded Linux computers. It continuously gathers system, CPU, memory, storage, and battery metrics, aggregates them into a structured JSON payload, appends them to a local SQLite durable spool, and flushes batches over HTTP to the EdgeShield Central Ingestion Server.

---

## Requirements & OS Support

* **Python:** 3.11+ (standard library SQLite3 used for spooling)
* **Operating Systems:** Windows 10/11, Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS), and macOS
* **Dependencies:** `psutil>=5.9.0`, `requests>=2.31.0`, `python-dotenv>=1.0.0` (specified in [`requirements.txt`](requirements.txt))

---

## Quick Install (Recommended)

Run the interactive guided setup wizard. The script automatically creates an isolated virtual environment (`.venv`), installs client dependencies, prompts for server configuration, and optionally configures auto-start on boot:

1. **Detects Python 3.11+** installed on the host system.
2. **Creates a local virtual environment** (`client/.venv`) if not already present.
3. **Installs client dependencies** (`pip install -r requirements.txt`) directly into `.venv`.
4. **Interactive configuration:** Prompts for Central Server IP, port, device identifier, and optional room tag, then generates `client/.env` (backing up any prior configuration).
5. **Auto-Start Registration (Optional):** Registers systemd user service (Linux) or Windows Scheduled Task using the `.venv` Python interpreter.
6. **Immediate Background Launch (Optional):** Launches the client agent immediately in the background using the `.venv` environment.

* **Linux / macOS:**
  ```bash
  cd client
  bash install/setup.sh
  ```

* **Windows (PowerShell):**
  ```powershell
  cd client
  powershell -ExecutionPolicy Bypass -File install\setup.ps1
  ```

> [!NOTE]
> *Server Deployment Note:* While client setup is automated via the guided wizards above, the Central Ingestion Server deployment remains manual and requires active Databricks SQL credentials (see [`server/README.md`](../server/README.md)).

---

## Standalone Client-Only Deployment

The PC client is completely decoupled from the central server, Databricks pipelines, and web frontend. Target endpoints only require a Python 3.11+ runtime and the `client/` folder:

```text
client/
├── client.py                 # Telemetry collection, spooling, and flush loop
├── config.py                 # Environment variables loader
├── spool.py                  # Durable SQLite offline queue
├── requirements.txt          # Client-only dependencies (psutil, requests, python-dotenv)
├── .env.example              # Configuration template
├── README.md                 # Client documentation
└── install/
    ├── setup.sh              # Linux/macOS guided interactive installer
    ├── setup.ps1             # Windows guided interactive installer
    ├── install_linux.sh      # systemd service installer
    ├── uninstall_linux.sh    # systemd service uninstaller
    ├── install_windows.ps1   # Scheduled Task installer
    ├── uninstall_windows.ps1 # Scheduled Task uninstaller
    └── edgeshield-client.service # systemd unit template
```

You can zip and distribute the `client/` directory onto remote lab or fleet PCs. The setup scripts do not depend on any files outside the client directory.

---

## Advanced / Manual Setup & Execution

If you prefer to configure the virtual environment and service manually:

1. **Create and activate a virtual environment:**
   * Linux / macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   * Windows:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```

2. **Install client dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables manually:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your target server and spooling settings:
   ```ini
   SERVER_IP=127.0.0.1
   SERVER_PORT=5000
   SERVER_ENDPOINT=/metrics
   DEVICE_ID=PC-WORKSTATION-01
   ROOM=Lab-A
   SAMPLING_INTERVAL_SECONDS=10

   # Spool & Batching Settings
   FLUSH_INTERVAL_SECONDS=60
   FLUSH_MAX_RECORDS=20
   SPOOL_MAX_RECORDS=5000
   SPOOL_DIR=./spool
   ```

4. **Run the agent:**
   ```bash
   python client.py
   ```
   The agent will initialize the local spool (`client/spool/telemetry_spool.db`), collect metrics every `SAMPLING_INTERVAL_SECONDS`, and flush pending records based on time or record count.

---

## Durable Offline Spooling & Batching

The agent implements a local-first offline spool architecture:

1. **Collect & Enqueue:** On every collection cycle (`SAMPLING_INTERVAL_SECONDS`), metrics are gathered and immediately committed to the local SQLite database.
2. **Dual Flush Triggers:** Pending records are flushed to the server whenever:
   * Elapsed time since last flush exceeds `FLUSH_INTERVAL_SECONDS` (default: 60s), **OR**
   * Total pending record count reaches or exceeds `FLUSH_MAX_RECORDS` (default: 20 records).
3. **Fault-Tolerant Delivery:** Records are POSTed one by one. Successfully sent records are removed immediately from the spool. If the server is unreachable or times out, the flush halts instantly and the remaining records are safely retained for the next cycle.
4. **FIFO Buffer Cap:** If the spool reaches `SPOOL_MAX_RECORDS` (default: 5000), the oldest records are automatically trimmed to preserve disk space and a console warning is emitted.

> [!NOTE]
> **Spool Directory Location:** By default, the local SQLite spool lives under `client/spool/` (`telemetry_spool.db`), resolved relative to the client package directory (`BASE_DIR`). This guarantees the spool database is always created inside the client folder regardless of your process current working directory.

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `SERVER_IP` | **Yes** | `127.0.0.1` | IP address or hostname of the EdgeShield Central Server |
| `SERVER_PORT` | No | `5000` | Port of the Central Server |
| `SERVER_ENDPOINT` | No | `/metrics` | HTTP path where metrics are posted |
| `DEVICE_ID` | No | `PC-<hostname>` | Unique device identifier override |
| `ROOM` | No | `""` | Optional location or room tag (e.g. `Lab-A`, `Server-Room`). Defaults to `""` (unassigned) |
| `SAMPLING_INTERVAL_SECONDS` | No | `10` | Interval between metric collection cycles (seconds) |
| `FLUSH_INTERVAL_SECONDS` | No | `60` | Maximum time between spool flush attempts (seconds) |
| `FLUSH_MAX_RECORDS` | No | `20` | Batch size threshold that triggers an immediate flush |
| `SPOOL_MAX_RECORDS` | No | `5000` | Maximum durable spool capacity before trimming oldest records |
| `SPOOL_DIR` | No | `client/spool` | Directory path where `telemetry_spool.db` is stored (default: `client/spool` relative to client package) |
| `LOG_DIR` | No | `client/logs` | Directory path where client logs are stored |
| `LOG_FILE` | No | `client/logs/client.log` | Target file for rotating agent logs |

### Setting Room / Location per Machine

To organize telemetry by physical deployment location, set the `ROOM` variable in `client/.env` (e.g. `ROOM=Lab-A`) or supply it as an environment variable:
```bash
ROOM=Lab-A python client.py
```
If unset, `ROOM` defaults to `""` (unassigned), ensuring full backward compatibility with unsegmented telemetry fleets.

---

## Battery Handling (Laptops vs. Desktops)

The telemetry agent features cross-platform battery detection with safe handling for both battery-backed and stationary hardware:

* **Laptops & Battery Nodes:** Gathers charge percentage, power plug state, and calculates battery health percentage by comparing `full_charge_capacity_raw` against `design_capacity_raw` (via `psutil` or Linux `/sys/class/power_supply/BAT*` sysfs nodes).
* **Desktops & Headless Servers:** When no battery is detected, the agent safely returns `"present": false` with normalized `null` metrics. This ensures the Databricks Silver layer never encounters schema mismatches or pipeline crashes when ingesting stationary systems.

---

## File Logging & Observability

The client agent records operational output simultaneously to stdout/console and a rotating file at `logs/client.log` (5 MB maximum per file, retaining up to 3 archive backups):
* **Startup Banner:** Full configuration summary (target URL, device identity, room, cadence, spool cap, and log file path).
* **Collection Telemetry:** Timestamps, sample counts, and pending spool size.
* **Flush Results:** Counts of records sent and failed per cycle.
* **Error Traces:** Network timeouts, connection refused alerts, and spool trimming warnings.

To tail logs in real time:
```bash
# Linux / macOS
tail -f logs/client.log

# Windows PowerShell
Get-Content -Wait -Tail 30 .\logs\client.log
```

---

## Auto-Start on Boot (Linux & Windows)

Automated scripts in [`client/install/`](install/) configure the client to run persistently in the background across system reboots.

> [!IMPORTANT]
> **Configuration Prerequisite:** Before enabling auto-start, verify that `client/.env` exists and contains your target `SERVER_IP`, `DEVICE_ID`, and optional `ROOM` tag.

### 1. Linux (systemd)

The installer detects your virtual environment (or system Python 3) and creates a systemd service unit.

* **User Service (Recommended — No Root Required):**
  Runs under the current user account and enables systemd lingering so it starts on boot without an interactive GUI session:
  ```bash
  cd client/install
  chmod +x install_linux.sh uninstall_linux.sh
  ./install_linux.sh
  ```
  *Check status and logs:*
  ```bash
  systemctl --user status edgeshield-client.service
  journalctl --user -u edgeshield-client.service -f
  ```
  *Uninstall:*
  ```bash
  ./uninstall_linux.sh
  ```

* **System-wide Service (Requires Root):**
  If deploying to a dedicated server appliance where a system daemon is preferred:
  ```bash
  sudo ./install_linux.sh --system
  sudo systemctl status edgeshield-client.service
  ```
  *Uninstall:*
  ```bash
  sudo ./uninstall_linux.sh
  ```

### 2. Windows (Scheduled Task)

Registers `EdgeShieldClient` in Windows Task Scheduler, ensuring non-blocking background execution with battery survival settings enabled.

* **User Logon Trigger (Recommended — Standard User / No Admin Required):**
  Starts automatically whenever you sign into Windows:
  ```powershell
  cd client\install
  .\install_windows.ps1
  ```
  *Check status:*
  ```powershell
  Get-ScheduledTask -TaskName "EdgeShieldClient"
  ```
  *Tail logs:*
  ```powershell
  Get-Content -Wait -Tail 30 ..\logs\client.log
  ```
  *Uninstall:*
  ```powershell
  .\uninstall_windows.ps1
  ```

* **System Startup Trigger (Requires Elevated Administrator PowerShell):**
  To launch at Windows boot before any user logs in, open PowerShell as Administrator and run:
  ```powershell
  cd client\install
  .\install_windows.ps1 -AtStartup
  ```

---

## Testing Offline Resilience

You can verify offline spooling and recovery with this test sequence:

1. **Simulate Network Outage (Server Down):**
   * Run the client without starting the central server:
     ```bash
     python client.py
     ```
   * Observe console logs: every collection cycle logs `Telemetry collected (pending: X)` and `pending` continues to increment.
   * When flush cycles trigger, the agent logs `[!] Connection Refused` and `Spool flush: 0 sent, 1 failed (pending: X)` while preserving all records.
2. **Restore Network Connectivity (Start Server):**
   * In a separate terminal, start the server:
     ```bash
     python server.py
     ```
   * On the next flush cycle, observe `Spool flush: X sent, 0 failed (pending: 0)` as all backlogged records are transmitted and drained from the local spool.
