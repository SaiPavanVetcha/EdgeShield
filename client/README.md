# EdgeShield PC Client Agent

> **Modular Python agent for collecting, durable offline spooling, and transmitting host hardware telemetry.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The PC Client Agent runs on host workstations, laptops, or embedded Linux computers. It continuously gathers system, CPU, memory, storage, and battery metrics, tags them with device identity and physical room metadata, appends them to a local SQLite durable spool (`client/spool/telemetry_spool.db`), and flushes batches over HTTP to the EdgeShield Central Ingestion Server.

---

## Key Capabilities

1. **Durable Offline Spooling:** Metrics are committed to a local SQLite database before transmission. If the network or central server drops, telemetry accumulates safely on disk and flushes in FIFO order upon reconnection.
2. **Physical Location Tagging (`ROOM`):** Supports physical room/lab segmentation (`ROOM=Lab-101`), flowing through to the Databricks Gold `dim_device` dimension and dashboard room filter.
3. **Adaptive Battery Detection (Laptops vs. Desktops):**
   - **Laptops:** Gathers charge percentage, AC plugged state, and calculates battery health percentage by comparing full-charge capacity against design capacity.
   - **Stationary Desktops & Servers:** Detects absence of battery hardware, sets `"present": false`, and normalizes battery fields to `null`. This prevents ingestion pipeline schema errors and suppresses false low-battery alerts in the web dashboard.
4. **Auto-Start On Boot:** Automated installers configure a systemd user service (Linux) or Windows Scheduled Task for unattended background operation across reboots.

---

## Requirements & OS Support

* **Python:** 3.11+
* **Operating Systems:** Windows 10/11, Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS), and macOS
* **Dependencies:** `psutil>=5.9.0`, `requests>=2.31.0`, `python-dotenv>=1.0.0` (specified in [`requirements.txt`](requirements.txt))

---

## Quick Install (Recommended Guided Setup)

An interactive guided setup script automatically provisions a dedicated virtual environment (`.venv`), installs dependencies, prompts for server IP and room configuration, and optionally configures auto-start on boot:

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

The installer will prompt for:
- **Central Server IP / Hostname** (default: `127.0.0.1`)
- **Server Port** (default: `5000`)
- **Device ID Override** (default: `PC-<hostname>`)
- **Room / Location Tag** (e.g. `Lab-A`, `Room-101`, `Server-Rack-1`)
- **Auto-Start on Boot** (systemd or Windows Scheduled Task)

---

## Manual Setup & Execution

If you prefer to configure the agent manually:

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

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment (`.env`):**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your deployment settings:
   ```ini
   SERVER_IP=127.0.0.1
   SERVER_PORT=5000
   SERVER_ENDPOINT=/metrics
   DEVICE_ID=PC-WORKSTATION-01
   ROOM=Lab-101
   SAMPLING_INTERVAL_SECONDS=10

   # Spool & Batching Settings
   FLUSH_INTERVAL_SECONDS=60
   FLUSH_MAX_RECORDS=20
   SPOOL_MAX_RECORDS=5000
   SPOOL_DIR=./spool
   ```

4. **Run the client agent:**
   ```bash
   python client.py
   ```
   Or override the room on the command line:
   ```bash
   ROOM=Lab-202 python client.py
   ```

---

## Battery Handling Behavior

EdgeShield differentiates portable battery-backed devices from stationary hardware:

| Machine Type | Battery Detection | Payload `battery` Object | Dashboard Behavior |
| :--- | :--- | :--- | :--- |
| **Laptop / Mobile Node** | Hardware battery detected | `{"present": true, "battery_pct": 85.0, "battery_health_pct": 94.2, "power_plugged": true}` | Displays Battery KPI card & Power & Battery chart; alerts fire if charge < 20% |
| **Desktop / Server** | No battery detected | `{"present": false, "battery_pct": null, "battery_health_pct": null, "power_plugged": true}` | Battery KPI card & chart dynamically hidden; no low-battery alerts generated |

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `SERVER_IP` | **Yes** | `127.0.0.1` | IP address or hostname of Central Ingestion Server |
| `SERVER_PORT` | No | `5000` | Port of Central Ingestion Server |
| `SERVER_ENDPOINT` | No | `/metrics` | HTTP path where telemetry is posted |
| `DEVICE_ID` | No | `PC-<hostname>` | Unique device identifier override |
| `ROOM` | No | `""` | Location or room tag (e.g. `Lab-A`, `Server-Room`). Defaults to `""` (unassigned) |
| `SAMPLING_INTERVAL_SECONDS` | No | `10` | Sampling cadence in seconds |
| `FLUSH_INTERVAL_SECONDS` | No | `60` | Maximum time between spool flush attempts (seconds) |
| `FLUSH_MAX_RECORDS` | No | `20` | Batch size threshold that triggers an immediate flush |
| `SPOOL_MAX_RECORDS` | No | `5000` | Maximum durable spool capacity before trimming oldest records |
| `SPOOL_DIR` | No | `client/spool` | Directory path where `telemetry_spool.db` is stored |
| `LOG_DIR` | No | `client/logs` | Directory path where client logs are stored |
| `LOG_FILE` | No | `client/logs/client.log` | Target file for rotating agent logs |

---

## Auto-Start On Boot

### 1. Linux (systemd User Service)
Runs under the current user account without requiring root:
```bash
cd client/install
chmod +x install_linux.sh uninstall_linux.sh
./install_linux.sh
```
* Status: `systemctl --user status edgeshield-client.service`
* Uninstall: `./uninstall_linux.sh`

### 2. Windows (Scheduled Task)
Registers `EdgeShieldClient` in Windows Task Scheduler:
```powershell
cd client\install
.\install_windows.ps1
```
* Status: `Get-ScheduledTask -TaskName "EdgeShieldClient"`
* Uninstall: `.\uninstall_windows.ps1`

---

## Testing Offline Resilience

1. **Simulate Outage:** Run the client while the central server is stopped (`python client.py`). Notice that pending records increment in the console output and logs (`client/logs/client.log`). Connection errors are caught safely.
2. **Restore Connection:** Start the server (`cd ../server && python server.py`). On the next flush cycle, observe all backlogged records transmit and drain from the local SQLite spool.
