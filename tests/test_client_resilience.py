import os
import sys
import unittest
from unittest.mock import MagicMock, patch
import requests

CLIENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client"))


class TestClientResilience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Stash and isolate conflicting modules (config, spool)
        cls._saved_modules = {}
        for mod_name in ["config", "spool", "collectors", "client"]:
            if mod_name in sys.modules:
                cls._saved_modules[mod_name] = sys.modules.pop(mod_name)

        if CLIENT_DIR not in sys.path:
            sys.path.insert(0, CLIENT_DIR)

        import client
        cls.client = client

    @classmethod
    def tearDownClass(cls):
        # Remove client modules from sys.modules
        for mod_name in ["config", "spool", "collectors", "client"]:
            sys.modules.pop(mod_name, None)

        if CLIENT_DIR in sys.path:
            sys.path.remove(CLIENT_DIR)

        # Restore previously loaded modules (e.g. server config/spool)
        for mod_name, mod in cls._saved_modules.items():
            sys.modules[mod_name] = mod

    def setUp(self):
        self.client.close_session()
        self.client._consecutive_failures = 0

    def tearDown(self):
        self.client.close_session()
        self.client._consecutive_failures = 0

    def test_session_lifecycle_and_reset(self):
        """Verify session is created on demand, reused, and cleanly torn down on close_session()."""
        sess1 = self.client.get_session()
        self.assertIsInstance(sess1, requests.Session)

        sess2 = self.client.get_session()
        self.assertIs(sess1, sess2, "Subsequent calls should reuse active session")

        # Close session
        self.client.close_session()
        self.assertIsNone(self.client._session, "_session should be None after close_session()")

        # Next call creates a fresh session
        sess3 = self.client.get_session()
        self.assertIsNotNone(sess3)
        self.assertIsNot(sess1, sess3, "Fresh session must be created after close_session()")

    def test_send_payload_failure_and_throttled_logging(self):
        """Verify session is closed on network error and failure logs are throttled (1st, 10th, 20th)."""
        sample_payload = {"device_id": "test-device", "metrics": {}}

        with patch.object(self.client, "log") as mock_log:
            with patch.object(requests.Session, "post", side_effect=requests.exceptions.ConnectionError("Connection refused")):
                # Attempt 1 -> should log initial failure
                result1 = self.client.send_payload(sample_payload)
                self.assertFalse(result1)
                self.assertEqual(self.client._consecutive_failures, 1)
                self.assertIsNone(self.client._session, "Session must be torn down on connection failure")
                mock_log.assert_called_with(
                    f"[!] Server unreachable at {self.client.SERVER_URL} (Connection Refused / Network Down). Spooling telemetry locally."
                )

                mock_log.reset_mock()

                # Attempts 2 to 9 -> should NOT log to prevent console spam
                for i in range(2, 10):
                    res = self.client.send_payload(sample_payload)
                    self.assertFalse(res)
                    self.assertEqual(self.client._consecutive_failures, i)
                mock_log.assert_not_called()

                # Attempt 10 -> should log 10th retry notification
                result10 = self.client.send_payload(sample_payload)
                self.assertFalse(result10)
                self.assertEqual(self.client._consecutive_failures, 10)
                self.assertTrue(mock_log.called)
                self.assertIn("retry #10", mock_log.call_args[0][0])

                mock_log.reset_mock()

                # Attempts 11 to 19 -> should NOT log
                for i in range(11, 20):
                    res = self.client.send_payload(sample_payload)
                    self.assertFalse(res)
                    self.assertEqual(self.client._consecutive_failures, i)
                mock_log.assert_not_called()

                # Attempt 20 -> should log 20th retry notification
                result20 = self.client.send_payload(sample_payload)
                self.assertFalse(result20)
                self.assertEqual(self.client._consecutive_failures, 20)
                self.assertTrue(mock_log.called)
                self.assertIn("retry #20", mock_log.call_args[0][0])

    def test_send_payload_recovery_resets_counter(self):
        """Verify successful transmission resets failure counter and logs restoration."""
        sample_payload = {"device_id": "test-device", "metrics": {}}
        self.client._consecutive_failures = 5

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status.return_value = None

        with patch.object(self.client, "log") as mock_log:
            with patch.object(requests.Session, "post", return_value=mock_resp):
                success = self.client.send_payload(sample_payload)
                self.assertTrue(success)
                self.assertEqual(self.client._consecutive_failures, 0)
                mock_log.assert_called_with(f"[*] Connection restored to {self.client.SERVER_URL}. Resuming spool drain.")

    def test_flush_spool_aborts_on_failure_preserving_records(self):
        """Verify spool records are preserved when transmission fails during flush."""
        fake_batch = [
            (1, {"device_id": "dev1"}),
            (2, {"device_id": "dev2"}),
            (3, {"device_id": "dev3"}),
        ]

        with patch.object(self.client, "fetch_batch", side_effect=[fake_batch, []]), \
             patch.object(self.client, "send_payload", side_effect=[True, False, True]), \
             patch.object(self.client, "delete_ids") as mock_delete, \
             patch.object(self.client, "count", return_value=2):

            sent, failed = self.client.flush_spool()
            # First payload succeeded (deleted ID 1)
            mock_delete.assert_called_once_with([1])
            # Second failed, aborting the flush
            self.assertEqual(sent, 1)
            self.assertEqual(failed, 1)


if __name__ == "__main__":
    unittest.main()
