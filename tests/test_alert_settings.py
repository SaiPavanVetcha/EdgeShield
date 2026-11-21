import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add web/backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "backend")))

from app.models import AlertThresholds, AlertItem
from app.services.alert_settings_service import AlertSettingsService
from app.services.alert_engine import alert_engine


class TestAlertSettings(unittest.TestCase):
    def setUp(self):
        self.service = AlertSettingsService()
        # Reset memory state
        self.service._global_thresholds = AlertThresholds()
        self.service._room_thresholds = {}

    def test_default_thresholds(self):
        settings = self.service.get_settings("global")
        self.assertEqual(settings.scope, "global")
        self.assertFalse(settings.is_custom)
        self.assertEqual(settings.thresholds.cpu_pct, 85.0)
        self.assertEqual(settings.thresholds.ram_pct, 90.0)
        self.assertEqual(settings.thresholds.disk_pct, 90.0)
        self.assertEqual(settings.thresholds.temperature_c, 35.0)
        self.assertEqual(settings.thresholds.battery_pct, 20.0)
        self.assertEqual(settings.thresholds.battery_health_pct, 60.0)
        self.assertEqual(settings.thresholds.offline_minutes, 3.0)

    def test_room_fallback_to_global_when_no_override(self):
        settings = self.service.get_settings("Lab-101")
        self.assertEqual(settings.scope, "Lab-101")
        self.assertFalse(settings.is_custom)
        self.assertEqual(settings.thresholds.cpu_pct, 85.0)

    def test_room_override_and_reset(self):
        # Update room-specific threshold
        custom_thresh = AlertThresholds(cpu_pct=70.0, temperature_c=30.0)
        res = self.service.update_thresholds("Lab-101", custom_thresh)
        self.assertEqual(res.scope, "Lab-101")
        self.assertTrue(res.is_custom)
        self.assertEqual(res.thresholds.cpu_pct, 70.0)
        self.assertEqual(res.thresholds.temperature_c, 30.0)

        # Global remains unchanged
        global_res = self.service.get_settings("global")
        self.assertEqual(global_res.thresholds.cpu_pct, 85.0)

        # Querying room thresholds via get_thresholds_for_room
        t = self.service.get_thresholds_for_room("Lab-101")
        self.assertEqual(t.cpu_pct, 70.0)
        t_other = self.service.get_thresholds_for_room("Server-Room")
        self.assertEqual(t_other.cpu_pct, 85.0)

        # Reset room-specific threshold
        reset_res = self.service.reset_thresholds("Lab-101")
        self.assertEqual(reset_res.scope, "Lab-101")
        self.assertFalse(reset_res.is_custom)
        self.assertEqual(reset_res.thresholds.cpu_pct, 85.0)

    @patch("app.services.alert_engine.db_manager.execute_query")
    def test_alert_engine_room_attribute_and_filtering(self, mock_query):
        # Mock database returning devices in different rooms
        def fake_query(sql, *args, **kwargs):
            if "dim_device d" in sql and "MAX(events.event_timestamp)" in sql:
                return ([
                    {"device_key": "k1", "device_id": "dev-lab", "hostname": "lab-pc", "room": "Lab-101", "last_seen": "2026-11-21 00:00:00"},
                    {"device_key": "k2", "device_id": "dev-sr", "hostname": "server-pc", "room": "Server-Room", "last_seen": "2026-11-21 00:00:00"},
                    {"device_key": "k3", "device_id": "dev-none", "hostname": "unassigned-pc", "room": None, "last_seen": "2026-11-21 00:00:00"},
                ], False, "online")
            elif "fact_cpu_telemetry" in sql:
                return ([
                    {"device_id": "dev-lab", "hostname": "lab-pc", "room": "Lab-101", "avg_cpu": 88.0, "latest_ts": "2026-11-21 06:00:00"},
                ], False, "online")
            return ([], False, "online")

        mock_query.side_effect = fake_query

        # Call get_alerts() for fleet (all)
        res_all = alert_engine.get_alerts()
        # Should have alerts for offline devices and the CPU alert
        self.assertTrue(len(res_all.alerts) > 0)
        # Verify alert item has room attribute
        lab_alerts = [a for a in res_all.alerts if a.device_id == "dev-lab"]
        self.assertTrue(any(a.room == "Lab-101" for a in lab_alerts))

        unassigned_alerts = [a for a in res_all.alerts if a.device_id == "dev-none"]
        self.assertTrue(any(a.room is None for a in unassigned_alerts))

        # Test room filtering: Lab-101
        res_lab = alert_engine.get_alerts(room="Lab-101")
        self.assertTrue(all(a.room == "Lab-101" for a in res_lab.alerts))

        # Test room filtering: unassigned
        res_unassigned = alert_engine.get_alerts(room="unassigned")
        self.assertTrue(all(not a.room for a in res_unassigned.alerts))


if __name__ == "__main__":
    unittest.main()
