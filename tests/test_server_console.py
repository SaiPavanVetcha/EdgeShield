import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

# Add server directory to sys.path
SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

import device_registry
from routes.console_api import get_console_devices, get_console_status
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


class TestServerConsoleEndpoints(unittest.TestCase):
    def setUp(self):
        device_registry.clear_registry()

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

        # Verify registry updated
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
        self.assertIn("uptime_seconds", data)
        self.assertIn("storage_mode", data)
        self.assertIn("spool", data)
        self.assertIn("devices", data)
        self.assertIn("pending", data["spool"])
        self.assertIn("total", data["devices"])
        self.assertIn("online", data["devices"])

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

    def test_health_endpoint(self):
        data = server.health_check()
        self.assertEqual(data["status"], "online")
        self.assertIn("spool", data)

    def test_landing_page_html(self):
        req = DummyRequest(headers={"accept": "text/html,application/xhtml+xml"})
        resp = server.root_endpoint(req)
        self.assertEqual(resp.status_code, 200)
        body = resp.body.decode("utf-8")
        self.assertIn("EdgeShield Central Server", body)
        self.assertIn("/api/console/status", body)
        self.assertIn("/console", body)

    def test_landing_page_json_content_negotiation(self):
        req = DummyRequest(headers={"accept": "application/json"})
        resp = server.root_endpoint(req)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("application/json", resp.media_type)

    def test_console_page_html(self):
        resp = server.console_view()
        self.assertEqual(resp.status_code, 200)
        self.assertIn("EdgeShield Server Console", resp.body.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
