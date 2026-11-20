import unittest
from unittest.mock import patch, MagicMock
import os
import sys
from fastapi import HTTPException

# Add web/backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "backend")))

from app.validation import (
    validate_device_id,
    validate_room,
    validate_device_key,
    validate_metric,
    validate_trunc_grain,
    validate_timestamp,
    ALLOWED_METRICS,
    ALLOWED_TRUNC_GRAINS,
)
from app.services.databricks_service import databricks_service


class TestValidation(unittest.TestCase):
    def test_validate_device_id_valid(self):
        self.assertEqual(validate_device_id("dev-001"), "dev-001")
        self.assertEqual(validate_device_id("dev_002.test"), "dev_002.test")
        self.assertEqual(validate_device_id("all"), "all")
        self.assertEqual(validate_device_id(None), "all")

    def test_validate_device_id_injection_rejected(self):
        injections = [
            "dev-1' OR '1'='1",
            "dev; DROP TABLE dim_device;",
            "dev/*comment*/",
            "dev' --",
            "<script>alert(1)</script>",
            "a" * 65,  # exceeds max len
        ]
        for inj in injections:
            with self.assertRaises(HTTPException, msg=f"Should reject: {inj}"):
                validate_device_id(inj)

    def test_validate_room_valid(self):
        self.assertIsNone(validate_room(None))
        self.assertIsNone(validate_room("all"))
        self.assertIsNone(validate_room(""))
        self.assertEqual(validate_room("Room 101"), "Room 101")
        self.assertEqual(validate_room("Conference-A"), "Conference-A")

    def test_validate_room_injection_rejected(self):
        injections = [
            "Room' OR 1=1 --",
            "Room; TRUNCATE gold.dim_device;",
            "Room/*injection*/",
        ]
        for inj in injections:
            with self.assertRaises(HTTPException, msg=f"Should reject: {inj}"):
                validate_room(inj)

    def test_validate_timestamp_valid(self):
        self.assertEqual(validate_timestamp(None), "")
        self.assertEqual(validate_timestamp("all"), "2020-01-01 00:00:00")
        self.assertEqual(validate_timestamp("2026-11-20T10:30:00Z"), "2026-11-20 10:30:00")
        self.assertEqual(validate_timestamp("2026-11-20 10:30:00"), "2026-11-20 10:30:00")
        self.assertEqual(validate_timestamp("2026-01-01T00:00:00.000Z"), "2026-01-01 00:00:00")

    def test_validate_timestamp_injection_rejected(self):
        injections = [
            "2026-01-01' OR '1'='1",
            "2026-01-01; DROP TABLE gold.fact_system_metrics;",
            "2026-01-01 -- comment",
            "invalid-date",
            "2026/13/45",
        ]
        for inj in injections:
            with self.assertRaises(HTTPException, msg=f"Should reject: {inj}"):
                validate_timestamp(inj)

    def test_validate_metric_and_grain(self):
        for m in ALLOWED_METRICS:
            self.assertEqual(validate_metric(m), m)
        with self.assertRaises(HTTPException):
            validate_metric("malicious_metric")

        for g in ALLOWED_TRUNC_GRAINS:
            self.assertEqual(validate_trunc_grain(g), g)
        # Invalid grain falls back safely to 'minute'
        self.assertEqual(validate_trunc_grain("year; DROP DATABASE;"), "minute")


class TestQueryParameterization(unittest.TestCase):
    @patch("app.services.databricks_service.db_manager.execute_query")
    def test_resolve_device_key_uses_parameters(self, mock_exec):
        mock_exec.return_value = ([{"device_key": "k-123"}], False, "success")
        key = databricks_service._resolve_device_key("dev-001")
        self.assertEqual(key, "k-123")
        self.assertTrue(mock_exec.called)
        query = mock_exec.call_args[0][0]
        params = mock_exec.call_args[1].get("params") or (mock_exec.call_args[0][1] if len(mock_exec.call_args[0]) > 1 else None)
        self.assertIn(":device_id", query)
        self.assertNotIn("dev-001", query)  # Should not be concatenated in SQL string
        self.assertEqual(params, {"device_id": "dev-001"})

    @patch.object(databricks_service, "_resolve_device_key")
    @patch("app.services.databricks_service.db_manager.execute_query")
    def test_get_timeseries_uses_parameters(self, mock_exec, mock_resolve):
        mock_resolve.return_value = "k-123"
        mock_exec.return_value = (
            [{"ts": "2026-11-20 10:00:00", "val": 45.2, "sec_val": None, "min_val": 40.0, "max_val": 50.0}],
            False,
            "success",
        )

        # 1. Single device query
        result = databricks_service.get_timeseries(
            device_id="dev-001",
            metric="cpu",
            from_ts="2026-11-20T09:00:00Z",
            to_ts="2026-11-20T10:00:00Z",
        )

        self.assertEqual(result.metric, "cpu")
        self.assertEqual(len(result.points), 1)

        query = mock_exec.call_args[0][0]
        params = mock_exec.call_args[1].get("params")
        self.assertIn(":device_key", query)
        self.assertIn(":from_ts", query)
        self.assertIn(":to_ts", query)
        self.assertNotIn("k-123", query)
        self.assertNotIn("2026-11-20 09:00:00", query)
        self.assertEqual(params["device_key"], "k-123")
        self.assertEqual(params["from_ts"], "2026-11-20 09:00:00")
        self.assertEqual(params["to_ts"], "2026-11-20 10:00:00")

        # 2. Fleet query with room filter
        mock_resolve.return_value = None
        result_fleet = databricks_service.get_timeseries(
            device_id="all",
            metric="cpu",
            from_ts="2026-11-20T09:00:00Z",
            to_ts="2026-11-20T10:00:00Z",
            room="Room 101",
        )
        query_fleet = mock_exec.call_args[0][0]
        params_fleet = mock_exec.call_args[1].get("params")
        self.assertIn(":room", query_fleet)
        self.assertNotIn("Room 101", query_fleet)
        self.assertEqual(params_fleet["room"], "Room 101")

    @patch("app.services.databricks_service.db_manager.execute_query")
    def test_get_kpis_fleet_uses_parameters(self, mock_exec):
        mock_exec.return_value = (
            [{"avg_cpu": 35.0, "min_cpu": 20.0, "max_cpu": 70.0, "sample_count": 100}],
            False,
            "success",
        )

        result = databricks_service.get_kpis(
            device_id="all",
            from_ts="2026-11-20T00:00:00Z",
            to_ts="2026-11-20T12:00:00Z",
            room="Lab-1",
        )

        self.assertIsNotNone(result.cpu)
        # Check that execute_query was called for the metric queries
        self.assertGreaterEqual(mock_exec.call_count, 1)
        for call in mock_exec.call_args_list:
            query = call[0][0]
            params = call[1].get("params")
            self.assertIn(":from_ts", query)
            self.assertIn(":to_ts", query)
            self.assertIn(":room", query)
            self.assertNotIn("Lab-1", query)
            self.assertEqual(params["room"], "Lab-1")
            self.assertEqual(params["from_ts"], "2026-11-20 00:00:00")
            self.assertEqual(params["to_ts"], "2026-11-20 12:00:00")


if __name__ == "__main__":
    unittest.main()
