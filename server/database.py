import os
import uuid
import queue
import threading
import time
from datetime import datetime, timezone
from databricks import sql
from dotenv import load_dotenv

load_dotenv()

DATABRICKS_HOST = os.getenv("DATABRICKS_HOST")
DATABRICKS_HTTP_PATH = os.getenv("DATABRICKS_HTTP_PATH")
DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")

# In-memory thread-safe queue to absorb concurrent client POST payloads
telemetry_queue = queue.Queue()

# Queue batching parameters
BATCH_SIZE = 20           # Process up to 20 metric payloads in one connection window
FLUSH_INTERVAL_SEC = 5.0  # Or flush every 5 seconds


def get_connection():
    """Establishes connection to Databricks SQL Warehouse."""
    return sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=DATABRICKS_TOKEN,
    )


def insert_telemetry_to_databricks(payload: dict):
    """
    Enqueues incoming telemetry payload instantly.
    Returns control immediately to FastAPI so the client receives a fast 200 OK response.
    """
    telemetry_queue.put(payload)


def _background_batch_worker():
    """
    Background worker thread that drains the queue and executes batch inserts
    using a single Databricks connection session.
    """
    while True:
        try:
            time.sleep(FLUSH_INTERVAL_SEC)

            if telemetry_queue.empty():
                continue

            # Pull up to BATCH_SIZE items from the queue
            batch = []
            while not telemetry_queue.empty() and len(batch) < BATCH_SIZE:
                batch.append(telemetry_queue.get_nowait())

            if not batch:
                continue

            print(f"[*] Processing batch of {len(batch)} telemetry payloads...")

            connection = None
            try:
                connection = get_connection()
                cursor = connection.cursor()

                for payload in batch:
                    event_id = str(uuid.uuid4())
                    device_id = payload.get("device_id")
                    hostname = payload.get("hostname")
                    timestamp = datetime.now(timezone.utc).isoformat()

                    metrics = payload.get("metrics", {}) or {}

                    system = metrics.get("system") or {}
                    cpu = metrics.get("cpu") or {}
                    ram = metrics.get("ram") or {}
                    disk = metrics.get("disk") or {}
                    battery = metrics.get("battery") or {}
                    dht_data = metrics.get("dht11") or metrics.get("dht22") or {}

                    # 1. System metrics
                    if system:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.system_metrics 
                            (event_id, device_id, hostname, timestamp, platform, boot_time_utc)
                            VALUES (?, ?, ?, CAST(? AS TIMESTAMP), ?, CAST(? AS TIMESTAMP))
                            """,
                            (event_id, device_id, hostname, timestamp, system.get("platform"), system.get("boot_time_utc")),
                        )

                    # 2. CPU metrics
                    if cpu:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.cpu_metrics 
                            (event_id, device_id, timestamp, utilization_percent, logical_cores, 
                             physical_cores, frequency_current_mhz, frequency_max_mhz)
                            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?)
                            """,
                            (
                                event_id,
                                device_id,
                                timestamp,
                                cpu.get("utilization_percent"),
                                cpu.get("logical_cores"),
                                cpu.get("physical_cores"),
                                cpu.get("frequency_current_mhz"),
                                cpu.get("frequency_max_mhz"),
                            ),
                        )

                    # 3. RAM metrics
                    if ram:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.ram_metrics 
                            (event_id, device_id, timestamp, total_bytes, used_bytes, available_bytes, 
                             utilization_percent, available_mb)
                            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?)
                            """,
                            (
                                event_id,
                                device_id,
                                timestamp,
                                ram.get("total_bytes"),
                                ram.get("used_bytes"),
                                ram.get("available_bytes"),
                                ram.get("utilization_percent"),
                                ram.get("available_mb"),
                            ),
                        )

                    # 4. Disk metrics
                    if disk:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.disk_metrics 
                            (event_id, device_id, timestamp, mount_point, total_bytes, used_bytes, 
                             free_bytes, free_gb, utilization_percent, read_bytes, write_bytes)
                            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                event_id,
                                device_id,
                                timestamp,
                                disk.get("mount_point"),
                                disk.get("total_bytes"),
                                disk.get("used_bytes"),
                                disk.get("free_bytes"),
                                disk.get("free_gb"),
                                disk.get("utilization_percent"),
                                disk.get("read_bytes"),
                                disk.get("write_bytes"),
                            ),
                        )

                    # 5. Battery metrics
                    if battery:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.battery_metrics 
                            (event_id, device_id, timestamp, present, percent, power_plugged, 
                             design_capacity_raw, full_charge_capacity_raw, health_percentage)
                            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                event_id,
                                device_id,
                                timestamp,
                                battery.get("present"),
                                battery.get("percent"),
                                battery.get("power_plugged"),
                                battery.get("design_capacity_raw"),
                                battery.get("full_charge_capacity_raw"),
                                battery.get("health_percentage"),
                            ),
                        )

                    # 6. Environment metrics (ESP32)
                    if dht_data:
                        cursor.execute(
                            """
                            INSERT INTO edgeshield_db.environment_metrics
                            (event_id, device_id, timestamp, temperature_c, humidity_percent)
                            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?)
                            """,
                            (
                                event_id,
                                device_id,
                                timestamp,
                                dht_data.get("temperature_c"),
                                dht_data.get("humidity_percent"),
                            ),
                        )

                    telemetry_queue.task_done()

                print(f"[+] Successfully flushed batch of {len(batch)} telemetry items to Databricks.")

            except Exception as batch_err:
                print(f"[!] Error during Databricks batch insertion: {batch_err}")

            finally:
                if connection:
                    try:
                        connection.close()
                    except Exception:
                        pass

        except Exception as thread_err:
            print(f"[!] Background worker exception: {thread_err}")


# Initialize background queue worker when database module loads
_worker_thread = threading.Thread(target=_background_batch_worker, daemon=True)
_worker_thread.start()