# EdgeShield PC Client Agent

> **Modular Python agent for collecting and transmitting host hardware telemetry.**  
> For the overall system architecture and end-to-end pipeline, see the [Root README](../README.md).

The PC Client Agent runs on host workstations, laptops, or embedded Linux computers. It continuously gathers system, CPU, memory, storage, and battery metrics, aggregates them into a structured JSON payload, and transmits them over HTTP to the EdgeShield Central Ingestion Server.

---

## Requirements & OS Support

* **Python:** 3.11+
* **Operating Systems:** Windows 10/11, Linux (Ubuntu, Debian, Fedora, Arch, Raspberry Pi OS), and macOS
* **Dependencies:** `psutil>=5.9.0`, `requests>=2.31.0`, `python-dotenv>=1.0.0` (included in root [`requirements.txt`](../requirements.txt))

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

   Update `.env` with your target server IP:
   ```ini
   SERVER_IP=127.0.0.1
   SERVER_PORT=5000
   SERVER_ENDPOINT=/metrics
   DEVICE_ID=PC-WORKSTATION-01
   SAMPLING_INTERVAL_SECONDS=10
   ```

3. **Run the agent:**
   ```bash
   python client.py
   ```
   The agent will initialize, print its configuration, and transmit telemetry at the configured sampling cadence (default: every 10 seconds).

---

## Configuration Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `SERVER_IP` | **Yes** | `127.0.0.1` | IP address or hostname of the EdgeShield Central Server |
| `SERVER_PORT` | No | `5000` | Port of the Central Server |
| `SERVER_ENDPOINT` | No | `/metrics` | HTTP path where metrics are posted |
| `DEVICE_ID` | No | `PC-<hostname>` | Unique device identifier override |
| `SAMPLING_INTERVAL_SECONDS` | No | `10` | Interval between metric transmissions (seconds) |

---

## Battery Handling (Laptops vs. Desktops)

The telemetry agent features cross-platform battery detection with safe handling for both battery-backed and stationary hardware:

* **Laptops & Battery Nodes:** Gathers charge percentage, power plug state, and calculates battery health percentage by comparing `full_charge_capacity_raw` against `design_capacity_raw` (via `psutil` or Linux `/sys/class/power_supply/BAT*` sysfs nodes).
* **Desktops & Headless Servers:** When no battery is detected, the agent safely returns `"present": false` with normalized `null` metrics. This ensures the Databricks Silver layer never encounters schema mismatches or pipeline crashes when ingesting stationary systems.

