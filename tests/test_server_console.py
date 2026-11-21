import os
import sys
import unittest
import logging
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

# Add server directory to sys.path
SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

import device_registry
import runtime_config
import log_buffer
import spool
from routes.console_api import (
    StorageModeRequest,
    get_console_devices,
    get_console_logs,
    get_console_status,
    manual_flush,
    update_storage_mode,
    export_spool,
)
from routes.metrics import receive_metrics
import server
from fastapi import HTTPException


def run_coro(coro):
    """Executes a simple single-frame async coroutine without full event-loop overhead."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value


class DummyClient:
    def __init__(self, host="192.168.1.100"):
        self.host = host


class DummyRequest:
    def __init__(self, json_data=None, headers=None, client_host="192.168.1.100"):
        self._json_data = json_data or {}
        self.headers = headers or {}
        self.client = DummyClient(client_host) if client_host else None

    async def json(self):
        return self._json_data


class TestDeviceRegistry(unittest.TestCase):
    def setUp(self):
        device_registry.clear_registry()

    def test_upsert_and_counts(self):
        payload1 = {
            "device_id": "laptop-01",
            "hostname": "macbook-pro",
            "type": "pc_telemetry",
            "room": "Room-A",
            "timestamp": "2026-11-20T10:00:00Z",
            "metrics": {
                "system": {"platform": "Darwin", "hostname": "macbook-pro"},
                "cpu": {"utilization_percent": 15.0},
                "battery": {"present": True, "percent": 90.0},
            },
        }

        rec = device_registry.upsert_from_request(payload1, client_ip="192.168.1.100")
        self.assertIsNotNone(rec)
        self.assertEqual(rec["device_id"], "laptop-01")
        self.assertEqual(rec["hostname"], "macbook-pro")
        self.assertEqual(rec["room"], "Room-A")
        self.assertEqual(rec["platform"], "Darwin")
        self.assertEqual(rec["client_ip"], "192.168.1.100")
        self.assertIn("cpu", rec["last_payload_meta"]["sections"])
        self.assertIn("battery", rec["last_payload_meta"]["sections"])

        # Check counts
        counts = device_registry.counts(online_within_seconds=120)
        self.assertEqual(counts["total"], 1)
        self.assertEqual(counts["online"], 1)

        # Check list_devices
        devs = device_registry.list_devices()
        self.assertEqual(len(devs), 1)
        self.assertTrue(devs[0]["is_online"])

    def test_device_offline_threshold(self):
        # Insert device with past last_seen_utc
        old_time = (datetime.now(timezone.utc) - timedelta(seconds=200)).isoformat()
        with device_registry._registry_lock:
            device_registry._devices["desktop-old"] = {
                "device_id": "desktop-old",
                "hostname": "old-pc",
                "type": "pc_telemetry",
                "platform": "Windows",
                "room": "Lab",
                "client_ip": "10.0.0.5",
                "last_seen_utc": old_time,
                "last_payload_meta": {"sections": ["cpu"]},
            }

        counts = device_registry.counts(online_within_seconds=120)
        self.assertEqual(counts["total"], 1)
        self.assertEqual(counts["online"], 0)

        devs = device_registry.list_devices(online_within_seconds=120)
        self.assertFalse(devs[0]["is_online"])

    def test_esp32_payload_upsert_and_inference(self):
        # 1. Standard ESP32 payload with explicit type and platform
        esp_payload = {
            "device_id": "ESP32-ENV-01",
            "hostname": "esp32-dht11-node",
            "room": "Server-Room",
            "type": "esp32_telemetry",
            "platform": "ESP32",
            "metrics": {
                "dht11": {"temperature_c": 24.5, "humidity_percent": 55.0}
            },
        }

        rec = device_registry.upsert_from_request(esp_payload, client_ip="192.168.1.150")
        self.assertIsNotNone(rec)
        self.assertEqual(rec["device_id"], "ESP32-ENV-01")
        self.assertEqual(rec["hostname"], "esp32-dht11-node")
        self.assertEqual(rec["room"], "Server-Room")
        self.assertEqual(rec["type"], "esp32_telemetry")
        self.assertEqual(rec["platform"], "ESP32")
        self.assertEqual(rec["client_ip"], "192.168.1.150")
        self.assertIn("dht11", rec["last_payload_meta"]["sections"])

        # 2. Legacy ESP32 payload without explicit type or platform (inferred from dht11/device_id)
        legacy_esp = {
            "device_id": "ESP32-LEGACY",
            "metrics": {
                "dht11": {"temperature_c": 21.0, "humidity_percent": 60.0}
            },
        }
        rec_legacy = device_registry.upsert_from_request(legacy_esp, client_ip="192.168.1.151")
        self.assertEqual(rec_legacy["type"], "esp32_telemetry")
        self.assertEqual(rec_legacy["platform"], "ESP32")

    def test_registry_persistence_and_payload_counts(self):
        # 1. First upsert for PC
        pc_payload = {
            "device_id": "pc-persist-1",
            "hostname": "workstation-pc",
            "room": "Server-Room-B",
            "metrics": {"system": {"platform": "Windows"}},
        }
        r1 = device_registry.upsert_from_request(pc_payload, client_ip="10.0.0.10")
        self.assertEqual(r1["payload_count"], 1)

        # 2. Second upsert for same device increments payload_count
        r2 = device_registry.upsert_from_request(pc_payload, client_ip="10.0.0.10")
        self.assertEqual(r2["payload_count"], 2)

        # 3. First upsert for ESP32
        esp_payload = {
            "device_id": "ESP32-PERSIST",
            "hostname": "esp-temp-node",
            "room": "Lab-2",
            "platform": "ESP32",
            "type": "esp32_telemetry",
            "metrics": {"dht11": {"temperature_c": 24.0}},
        }
        r3 = device_registry.upsert_from_request(esp_payload, client_ip="10.0.0.50")
        self.assertEqual(r3["payload_count"], 1)

        # Verify disk file exists
        self.assertTrue(os.path.exists(device_registry.DEVICES_FILE))

        # 4. Simulate server restart: clear memory only without deleting file
        with device_registry._registry_lock:
            device_registry._devices.clear()
        self.assertEqual(device_registry.counts()["total"], 0)

        # Reload from disk
        loaded_count = device_registry.load_registry()
        self.assertEqual(loaded_count, 2)
        devs = device_registry.list_devices()
        self.assertEqual(len(devs), 2)

        # Verify stable keys and data integrity
        dev_ids = {d["device_id"]: d for d in devs}
        self.assertIn("pc-persist-1", dev_ids)
        self.assertIn("ESP32-PERSIST", dev_ids)
        self.assertEqual(dev_ids["pc-persist-1"]["payload_count"], 2)
        self.assertEqual(dev_ids["pc-persist-1"]["room"], "Server-Room-B")
        self.assertEqual(dev_ids["ESP32-PERSIST"]["payload_count"], 1)
        self.assertEqual(dev_ids["ESP32-PERSIST"]["platform"], "ESP32")


class TestRuntimeConfig(unittest.TestCase):
    def setUp(self):
        # Clean up any test runtime_config.json
        if os.path.exists(runtime_config.RUNTIME_CONFIG_PATH):
            os.remove(runtime_config.RUNTIME_CONFIG_PATH)

    def tearDown(self):
        if os.path.exists(runtime_config.RUNTIME_CONFIG_PATH):
            os.remove(runtime_config.RUNTIME_CONFIG_PATH)

    def test_resolution_order_and_persistence(self):
        # 1. Default when no file and no env
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(runtime_config.get_storage_mode(), "databricks")

        # 2. Env variable precedence over default
        with patch.dict(os.environ, {"STORAGE_MODE": "local"}):
            self.assertEqual(runtime_config.get_storage_mode(), "local")

        # 3. File precedence over env
        runtime_config.set_storage_mode("databricks")
        with patch.dict(os.environ, {"STORAGE_MODE": "local"}):
            self.assertEqual(runtime_config.get_storage_mode(), "databricks")

        # 4. Persistence to file and reload
        runtime_config.set_storage_mode("local")
        self.assertEqual(runtime_config.get_storage_mode(), "local")

    def test_invalid_mode_rejected(self):
        with self.assertRaises(ValueError):
            runtime_config.set_storage_mode("invalid_mode")

    def test_is_databricks_configured(self):
        with patch.object(runtime_config, "DATABRICKS_HOST", "dbc-test.cloud"), \
             patch.object(runtime_config, "DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/123"), \
             patch.object(runtime_config, "DATABRICKS_TOKEN", "dapi-token"):
            self.assertTrue(runtime_config.is_databricks_configured())

        with patch.object(runtime_config, "DATABRICKS_HOST", ""):
            self.assertFalse(runtime_config.is_databricks_configured())


class TestLogBuffer(unittest.TestCase):
    def setUp(self):
        log_buffer.clear_log_buffer()
        log_buffer.attach_log_buffer()

    def test_log_capture(self):
        test_logger = logging.getLogger("test_console_logger")
        test_logger.setLevel(logging.INFO)
        test_logger.info("Test message for console buffer")
        test_logger.warning("Test warning for console buffer")

        logs = log_buffer.get_recent_logs(limit=10)
        self.assertGreaterEqual(len(logs), 2)
        messages = [l["message"] for l in logs]
        self.assertIn("Test message for console buffer", messages)
        self.assertIn("Test warning for console buffer", messages)


class TestServerConsoleEndpoints(unittest.TestCase):
    def setUp(self):
        device_registry.clear_registry()
        log_buffer.clear_log_buffer()
        log_buffer.attach_log_buffer()
        if os.path.exists(runtime_config.RUNTIME_CONFIG_PATH):
            os.remove(runtime_config.RUNTIME_CONFIG_PATH)

    def tearDown(self):
        if os.path.exists(runtime_config.RUNTIME_CONFIG_PATH):
            os.remove(runtime_config.RUNTIME_CONFIG_PATH)

    @patch("routes.metrics.enqueue")
    def test_metrics_route_updates_registry(self, mock_enqueue):
        payload = {
            "device_id": "dev-test-1",
            "hostname": "agent-host",
            "room": "Control-Room",
            "type": "pc_telemetry",
            "metrics": {
                "system": {"platform": "Linux"},
                "cpu": {"utilization_percent": 30.0},
            },
        }

        req = DummyRequest(json_data=payload, client_host="10.0.0.42")
        resp = run_coro(receive_metrics(req))

        self.assertEqual(resp["status"], "success")
        self.assertEqual(resp["device_id"], "dev-test-1")
        self.assertEqual(resp["room"], "Control-Room")
        self.assertTrue(mock_enqueue.called)

        dev = device_registry.get_device("dev-test-1")
        self.assertIsNotNone(dev)
        self.assertEqual(dev["hostname"], "agent-host")
        self.assertEqual(dev["room"], "Control-Room")
        self.assertEqual(dev["platform"], "Linux")
        self.assertEqual(dev["client_ip"], "10.0.0.42")

    def test_metrics_route_missing_device_id(self):
        req = DummyRequest(json_data={"room": "Room-B"})
        with self.assertRaises(HTTPException) as ctx:
            run_coro(receive_metrics(req))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_console_status_endpoint(self):
        data = get_console_status()
        self.assertEqual(data["status"], "online")
        self.assertTrue(data["server_online"])
        self.assertIn("host", data)
        self.assertIn("port", data)
        self.assertIn("listen_host", data)
        self.assertIn("listen_port", data)
        self.assertIn("advertised_host", data)
        self.assertIn("advertised_url", data)
        self.assertTrue(data["advertised_host"])
        self.assertTrue(data["advertised_url"].startswith("http://"))
        self.assertIn("uptime_seconds", data)
        self.assertIn("storage_mode", data)
        self.assertIn("databricks_configured", data)
        self.assertIn("pending", data)
        self.assertIn("last_flush", data)
        self.assertIn("spool", data)
        self.assertIn("devices", data)

    def test_export_spool_endpoint(self):
        # 1. JSONL export
        resp_jsonl = export_spool(format="jsonl")
        self.assertEqual(resp_jsonl.status_code, 200)
        self.assertIn("application/x-ndjson", resp_jsonl.media_type)
        self.assertIn("edgeshield_spool_", resp_jsonl.headers.get("content-disposition", ""))

        # 2. SQLite export
        resp_sqlite = export_spool(format="sqlite")
        self.assertEqual(resp_sqlite.status_code, 200)
        self.assertIn("sqlite3", resp_sqlite.media_type)
        self.assertIn(".db", resp_sqlite.headers.get("content-disposition", ""))

        # 3. Invalid format
        with self.assertRaises(HTTPException) as ctx:
            export_spool(format="xml")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_console_devices_endpoint(self):
        payload = {
            "device_id": "dev-007",
            "hostname": "agent-bond",
            "type": "pc_telemetry",
        }
        device_registry.upsert_from_request(payload, client_ip="127.0.0.1")

        data = get_console_devices()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["online"], 1)
        self.assertEqual(len(data["devices"]), 1)
        self.assertEqual(data["devices"][0]["device_id"], "dev-007")

    def test_storage_mode_endpoint(self):
        # Switch to local
        res = update_storage_mode(StorageModeRequest(mode="local"))
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["storage_mode"], "local")
        self.assertEqual(runtime_config.get_storage_mode(), "local")

        # Switch to databricks
        res = update_storage_mode(StorageModeRequest(mode="databricks"))
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["storage_mode"], "databricks")
        self.assertEqual(runtime_config.get_storage_mode(), "databricks")

        # Invalid mode
        with self.assertRaises(HTTPException) as ctx:
            update_storage_mode(StorageModeRequest(mode="unsupported"))
        self.assertEqual(ctx.exception.status_code, 400)

    @patch("routes.console_api.trigger_flush")
    def test_flush_endpoint(self, mock_trigger):
        mock_trigger.return_value = {
            "status": "success",
            "mode": "local",
            "inserted": 0,
            "failed": 0,
            "pending": 5,
            "message": "Storage mode is local; spool records retained durably on disk.",
            "last_flush": {"success": True},
        }
        res = manual_flush()
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["mode"], "local")
        self.assertEqual(res["pending"], 5)
        self.assertTrue(mock_trigger.called)

    def test_logs_endpoint(self):
        logger = logging.getLogger("test_logs_api")
        logger.setLevel(logging.INFO)
        logger.info("Sample log entry for API test")

        res = get_console_logs(limit=50)
        self.assertIn("logs", res)
        self.assertIn("total", res)
        self.assertGreaterEqual(res["total"], 1)

    def test_health_endpoint(self):
        data = server.health_check()
        self.assertEqual(data["status"], "online")
        self.assertIn("storage_mode", data)
        self.assertIn("spool", data)

    def test_landing_page_html(self):
        req = DummyRequest(headers={"accept": "text/html,application/xhtml+xml"})
        resp = server.root_endpoint(req)
        self.assertEqual(resp.status_code, 200)
        body = resp.body.decode("utf-8")
        self.assertIn("EdgeShield Central Server", body)
        self.assertIn("/api/console/status", body)
        self.assertIn("/console", body)
        self.assertIn("btn-cta", body)
        self.assertIn("pill-mode", body)

    def test_landing_page_json_content_negotiation(self):
        req = DummyRequest(headers={"accept": "application/json"})
        resp = server.root_endpoint(req)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("application/json", resp.media_type)

    def test_console_page_html_tabs(self):
        resp = server.console_view()
        self.assertEqual(resp.status_code, 200)
        body = resp.body.decode("utf-8")
        self.assertIn("EdgeShield Server Console", body)
        self.assertTrue("assets/index" in body or "tab-overview" in body)

        # Also verify embedded fallback view maintains all tab identifiers
        fallback_html = server.render_console_html()
        self.assertIn("tab-overview", fallback_html)
        self.assertIn("tab-devices", fallback_html)
        self.assertIn("tab-spool", fallback_html)
        self.assertIn("tab-logs", fallback_html)
        self.assertIn("btn-flush-now", fallback_html)
        self.assertIn("btn-mode-local", fallback_html)
        self.assertIn("btn-mode-databricks", fallback_html)
        self.assertIn("badge-unassigned", fallback_html)
        self.assertIn("chk-auto-logs", fallback_html)
        self.assertIn("mode-help-text", fallback_html)

    def test_console_react_spa_serving(self):
        resp = server.console_view()
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/html", resp.media_type)
        body = resp.body.decode("utf-8")
        self.assertIn("EdgeShield Server Console", body)
        self.assertIn("root", body)

    def test_console_devices_endpoint_stable_keys_and_counts(self):
        # Post a PC payload and an ESP32 payload
        req1 = DummyRequest(json_data={"device_id": "pc-01", "hostname": "pc-node", "room": "Lab-A", "metrics": {"cpu": {"utilization_percent": 10.0}}})
        req2 = DummyRequest(json_data={"device_id": "ESP32-02", "room": None, "metrics": {"dht11": {"temperature_c": 22.0}}})
        run_coro(receive_metrics(req1))
        run_coro(receive_metrics(req2))

        data = get_console_devices()
        self.assertEqual(data["total"], 2)
        self.assertEqual(data["online"], 2)
        self.assertEqual(len(data["devices"]), 2)

        for dev in data["devices"]:
            self.assertIn("device_id", dev)
            self.assertIn("hostname", dev)
            self.assertIn("type", dev)
            self.assertIn("platform", dev)
            self.assertIn("room", dev)
            self.assertIn("client_ip", dev)
            self.assertIn("first_seen_utc", dev)
            self.assertIn("last_seen_utc", dev)
            self.assertIn("payload_count", dev)
            self.assertIn("is_online", dev)
            self.assertIn("seconds_since_seen", dev)
            self.assertGreaterEqual(dev["payload_count"], 1)

        # Status counts must match registry
        status = get_console_status()
        self.assertEqual(status["devices"]["total"], 2)
        self.assertEqual(status["devices"]["online"], 2)

    def test_spool_corruption_auto_recovery(self):
        # 1. Corrupt the database file by writing invalid non-SQLite garbage
        db_path = spool.get_db_path()
        with open(db_path, "wb") as f:
            f.write(b"CORRUPTED_NON_SQLITE_GARBAGE_BYTES")

        # 2. Call enqueue - it should catch DatabaseError, log once, recreate clean DB, and enqueue successfully
        rec_id = spool.enqueue({"device_id": "recovery-test", "timestamp": "2026-11-21T10:00:00Z"})
        self.assertGreater(rec_id, 0)
        self.assertEqual(spool.count(), 1)
        batch = spool.fetch_batch(limit=10)
        self.assertEqual(len(batch), 1)
        self.assertEqual(batch[0][1]["device_id"], "recovery-test")


if __name__ == "__main__":
    unittest.main()
