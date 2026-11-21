import threading
from typing import Dict

_lock = threading.Lock()
_records_received: int = 0
_records_inserted_to_cloud: int = 0


def record_received(count: int = 1) -> None:
    """Increments the in-memory counter for total telemetry payloads received by this process."""
    global _records_received
    with _lock:
        _records_received += count


def record_inserted_to_cloud(count: int = 1) -> None:
    """Increments the in-memory counter for records successfully inserted into Databricks by this process."""
    global _records_inserted_to_cloud
    with _lock:
        _records_inserted_to_cloud += count


def get_process_counters() -> Dict[str, int]:
    """Returns current process session metrics."""
    with _lock:
        return {
            "records_received": _records_received,
            "records_inserted_to_cloud": _records_inserted_to_cloud,
        }


def reset_process_counters() -> None:
    """Resets session counters to zero (used primarily in test suites)."""
    global _records_received, _records_inserted_to_cloud
    with _lock:
        _records_received = 0
        _records_inserted_to_cloud = 0
