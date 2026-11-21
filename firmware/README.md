# EdgeShield ESP32 Environmental Firmware

> **Lightweight C++/Arduino firmware for ESP32 microcontrollers sampling ambient temperature and humidity via DHT11/DHT22 sensors.**  
> For the overall system architecture, see the [Root README](../README.md).

The ESP32 firmware samples physical environmental conditions (temperature in °C and relative humidity in %) and dispatches structured JSON telemetry over Wi-Fi directly to the EdgeShield Central Ingestion Server (`POST /metrics`).

---

## Parity with PC Client Agent

The ESP32 payload structure mirrors the PC client schema, enabling the Central Server and Databricks Lakehouse to ingest and attribute environmental sensors seamlessly:

```json
{
  "device_id": "ESP32-ENV-01",
  "hostname": "esp32-dht11-node",
  "room": "Server-Room",
  "type": "esp32_telemetry",
  "platform": "ESP32",
  "metrics": {
    "dht11": {
      "temperature_c": 24.5,
      "humidity_percent": 55.0
    }
  }
}
```

* **`device_id` & `hostname`:** Identifies the individual microcontroller node.
* **`room`:** Physical location tag (e.g. `Server-Room`, `Lab-101`), enabling room-scoped filtering across the dashboard.
* **`type`:** Marked as `esp32_telemetry` for device classification in the Server Console.
* **`platform`:** Explicitly set to `ESP32`.
* **`metrics.dht11`:** Ambient temperature (°C) and humidity (%).

---

## Hardware Requirements & Wiring

| Component | Specification | Connection to ESP32 |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32 DevKit v1 / NodeMCU-32S | Micro-USB connected to PC / 5V PSU |
| **Sensor** | DHT11 or DHT22 Temperature & Humidity | VCC $\to$ `3V3`, GND $\to$ `GND`, Data $\to$ `GPIO 4` (D4) |
| **Pull-Up Resistor** | 10kΩ resistor (optional) | Between VCC and Data pin (built into most 3-pin breakout modules) |

```
  ESP32 DevKit                 DHT11 Sensor Module
  ┌──────────┐                     ┌──────────┐
  │      3V3 ├─────────────────────┤ VCC      │
  │      GND ├─────────────────────┤ GND      │
  │   GPIO 4 ├─────────────────────┤ DATA/OUT │
  └──────────┘                     └──────────┘
```

---

## Configuration & Secret Management

> [!CAUTION]
> **Security Notice — Never Commit Credentials:**  
> Wi-Fi passwords and internal server IPs must **never** be committed to git. All credentials reside strictly in `config.h`, which is gitignored. Only `config.h.example` is committed.

### 1. Copy the Configuration Template
From the `firmware/` directory:
```bash
cp config.h.example config.h
```

### 2. Edit `config.h`
Open `config.h` in your editor and configure your network and deployment parameters:
```cpp
// --- Wi-Fi Network Credentials ---
const char* const WIFI_SSID = "Your_WiFi_Network";
const char* const WIFI_PASS = "Your_WiFi_Password";

// --- Ingestion Server Endpoint ---
const char* const SERVER_URL = "http://192.168.1.100:5000/metrics";

// --- Device Identity & Room Location ---
const char* const DEVICE_ID = "ESP32-ENV-01";
const char* const HOSTNAME  = "esp32-dht11-node";
const char* const ROOM      = "Lab-101";           // Physical room assignment
const char* const DEV_TYPE  = "esp32_telemetry";
const char* const PLATFORM  = "ESP32";

// --- Sensor Hardware Settings ---
#define DHTPIN 4          // GPIO pin connected to DHT sensor data pin
#define DHTTYPE DHT11     // Sensor model: DHT11, DHT22, or DHT21
```

---

## How to Set the Room per Node

To deploy multiple ESP32 nodes across different physical locations:
1. When flashing an ESP32 dedicated to a server rack, set:
   ```cpp
   const char* const DEVICE_ID = "ESP32-SRV-01";
   const char* const ROOM      = "Server-Room";
   ```
2. When flashing a node for a testing lab, set:
   ```cpp
   const char* const DEVICE_ID = "ESP32-LAB-01";
   const char* const ROOM      = "Lab-101";
   ```
Once flashed and powered on, each node transmits its assigned room in every telemetry packet. The ingestion server updates its registry and attributes the room to the node in the Lakehouse Gold `dim_device` dimension.

---

## Flashing Instructions (Arduino IDE)

### 1. Prerequisites & Board Support
1. Download and install the [Arduino IDE](https://www.arduino.cc/en/software) (version 2.0+ recommended).
2. Add ESP32 board support:
   - Navigate to **File $\to$ Preferences**.
   - In **Additional boards manager URLs**, add:  
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Open **Tools $\to$ Board $\to$ Boards Manager**, search for `esp32` by **Espressif Systems**, and install.

### 2. Install Required Libraries
Open **Tools $\to$ Manage Libraries...** and install:
* **`DHT sensor library`** by Adafruit
* **`Adafruit Unified Sensor`** by Adafruit
* **`ArduinoJson`** by Benoît Blanchon (supports both v6 and v7)

### 3. Compile & Upload
1. Open [`esp32_dht11.ino`](esp32_dht11.ino) in the Arduino IDE.
2. Select your board: **Tools $\to$ Board $\to$ esp32 $\to$ ESP32 Dev Module**.
3. Select your serial port: **Tools $\to$ Port $\to$ COMx** (Windows) or `/dev/ttyUSBx` (Linux/macOS).
4. Verify upload settings:
   - **Upload Speed:** `115200` (or `921600`)
   - **CPU Frequency:** `240MHz (WiFi/BT)`
   - **Flash Frequency:** `80MHz`
5. Click the **Upload** button (`Ctrl+U` or `Cmd+U`).  
   *(If the upload hangs on `Connecting.......`, press and hold the **BOOT** button on the ESP32 until the upload starts).*

---

## Operational Verification

### 1. Serial Monitor Logs
Open the Arduino Serial Monitor at **115200 baud**:
```text
========================================
   EdgeShield ESP32 Environmental Node  
========================================
Device ID : ESP32-ENV-01
Hostname  : esp32-dht11-node
Room      : Server-Room
Server URL: http://192.168.1.100:5000/metrics
----------------------------------------
Connecting to Wi-Fi SSID: Your_WiFi_Network
.....
[+] Wi-Fi Connected!
[+] IP Address: 192.168.1.145
[+] RSSI: -54 dBm
[Sensor] Temp: 23.4 °C | Humidity: 48.0 % | Room: Server-Room
[+] Telemetry sent! HTTP 200 (Room: Server-Room)
```

### 2. EdgeShield Server Console
Open the Server Console in your browser:
* URL: `http://<SERVER_IP>:5000/console`
* Navigate to the **Devices** tab:
  - Confirm `ESP32-ENV-01` appears with status **ONLINE**.
  - Verify **Room** is displayed as `Server-Room`.
  - Verify **Type** is `esp32_telemetry` and **Platform** is `ESP32`.
  - Verify **Client IP** displays the ESP32's local network IP.
