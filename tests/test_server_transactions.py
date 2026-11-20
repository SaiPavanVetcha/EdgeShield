import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add server directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))

import database


class TestServerTransactions(unittest.TestCase):
    def setUp(self):
        database._has_room_column = None

    def test_insert_single_payload_all_metrics(self):
        cursor = MagicMock()
        payload = {
            "device_id": "test-device-1",
            "hostname": "test-host",
            "room": "Server-Room-A",
            "metrics": {
                "system": {"platform": "Windows", "boot_time_utc": "2026-11-20T10:00:00Z"},
                "cpu": {"utilization_percent": 25.5, "logical_cores": 8},
                "ram": {"total_bytes": 16000000000, "utilization_percent": 50.0},
                "disk": {"mount_point": "C:\\", "utilization_percent": 60.0},
                "battery": {"present": True, "percent": 88.0},
                "dht11": {"temperature_c": 22.5, "humidity_percent": 45.0},
            },
        }

        database.insert_single_payload(cursor, payload)
        # Should have executed 6 INSERT statements
        self.assertEqual(cursor.execute.call_count, 6)

    def test_insert_single_payload_room_fallback(self):
        cursor = MagicMock()

        # First call fails because room column is missing
        def execute_side_effect(sql, params=None):
            if "edgeshield_db.system_metrics" in sql and "room" in sql:
                raise Exception("AnalysisException: Column 'room' cannot be resolved")
            return None

        cursor.execute.side_effect = execute_side_effect

        payload = {
            "device_id": "test-device-2",
            "hostname": "test-host-2",
            "room": "Unmigrated-Room",
            "metrics": {
                "system": {"platform": "Linux"},
            },
        }

        database.insert_single_payload(cursor, payload)
        # Should have attempted once with room, caught error, and executed fallback without room
        self.assertEqual(cursor.execute.call_count, 2)
        second_call_sql = cursor.execute.call_args_list[1][0][0]
        self.assertNotIn("room", second_call_sql)
        self.assertFalse(database._has_room_column)

    @patch("database.get_connection")
    @patch("database.fetch_batch")
    @patch("database.delete_ids")
    @patch("database.count")
    def test_flush_spool_transaction_success(self, mock_count, mock_delete_ids, mock_fetch_batch, mock_get_conn):
        mock_count.side_effect = [2, 0]
        mock_conn = MagicMock()
        mock_conn.ignore_transactions = False
        mock_conn.autocommit = False
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        mock_fetch_batch.side_effect = [
            [
                (1, {"device_id": "dev-1", "metrics": {"cpu": {"utilization_percent": 10.0}}}),
                (2, {"device_id": "dev-2", "metrics": {"ram": {"utilization_percent": 20.0}}}),
            ],
            [],
        ]

        with patch.object(database, "DATABRICKS_HOST", "test-host"), \
             patch.object(database, "DATABRICKS_HTTP_PATH", "/test/path"), \
             patch.object(database, "DATABRICKS_TOKEN", "test-token"):
            sent, failed = database.flush_spool_to_databricks()

        self.assertEqual(sent, 2)
        self.assertEqual(failed, 0)
        # Verify commit was called after each payload
        self.assertEqual(mock_conn.commit.call_count, 2)
        mock_conn.rollback.assert_not_called()
        # Verify delete_ids called for both records
        mock_delete_ids.assert_any_call([1])
        mock_delete_ids.assert_any_call([2])

    @patch("database.get_connection")
    @patch("database.fetch_batch")
    @patch("database.delete_ids")
    @patch("database.count")
    def test_flush_spool_transaction_failure_rollback_and_retain(
        self, mock_count, mock_delete_ids, mock_fetch_batch, mock_get_conn
    ):
        mock_count.return_value = 2
        mock_conn = MagicMock()
        mock_conn.ignore_transactions = False
        mock_conn.autocommit = False
        mock_cursor = MagicMock()

        # Simulate failure during second metric insert of payload
        def cursor_exec(sql, params=None):
            if "ram_metrics" in sql:
                raise Exception("Simulated DB connection drop or constraint failure")
            return None

        mock_cursor.execute.side_effect = cursor_exec
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn

        mock_fetch_batch.return_value = [
            (
                101,
                {
                    "device_id": "dev-failed",
                    "metrics": {
                        "cpu": {"utilization_percent": 10.0},
                        "ram": {"utilization_percent": 20.0},  # will fail
                    },
                },
            ),
            (102, {"device_id": "dev-next", "metrics": {"cpu": {"utilization_percent": 15.0}}}),
        ]

        with patch.object(database, "DATABRICKS_HOST", "test-host"), \
             patch.object(database, "DATABRICKS_HTTP_PATH", "/test/path"), \
             patch.object(database, "DATABRICKS_TOKEN", "test-token"):
            sent, failed = database.flush_spool_to_databricks()

        self.assertEqual(sent, 0)
        self.assertEqual(failed, 1)
        # Verify rollback was called for the failed payload
        mock_conn.rollback.assert_called_once()
        mock_conn.commit.assert_not_called()
        # Verify delete_ids was NEVER called (records retained in spool)
        mock_delete_ids.assert_not_called()


if __name__ == "__main__":
    unittest.main()
