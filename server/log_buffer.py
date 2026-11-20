import collections
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

_MAX_LOG_ENTRIES = 500
_log_buffer = collections.deque(maxlen=_MAX_LOG_ENTRIES)
_log_lock = threading.Lock()
_handler_instance: Optional["RingBufferLogHandler"] = None


class RingBufferLogHandler(logging.Handler):
    """Logging handler that retains the latest N log records in an in-memory ring buffer."""

    def __init__(self, capacity: int = _MAX_LOG_ENTRIES):
        super().__init__()
        self.capacity = capacity
        self.setFormatter(
            logging.Formatter(
                fmt="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )

    def emit(self, record: logging.LogRecord) -> None:
        try:
            formatted = self.format(record)
            entry = {
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "line": formatted,
            }
            with _log_lock:
                _log_buffer.append(entry)
        except Exception:
            self.handleError(record)


def get_log_handler() -> RingBufferLogHandler:
    """Returns the singleton log handler instance."""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = RingBufferLogHandler()
    return _handler_instance


def attach_log_buffer() -> RingBufferLogHandler:
    """Attaches the ring buffer log handler to the root logger."""
    handler = get_log_handler()
    handler.setLevel(logging.INFO)
    root_logger = logging.getLogger()
    if handler not in root_logger.handlers:
        root_logger.addHandler(handler)
    if root_logger.level > logging.INFO or root_logger.level == logging.NOTSET:
        root_logger.setLevel(logging.INFO)
    return handler


def get_recent_logs(limit: int = 100) -> List[Dict[str, Any]]:
    """Returns the most recent log entries, up to limit."""
    capped_limit = max(1, min(limit, _MAX_LOG_ENTRIES))
    with _log_lock:
        items = list(_log_buffer)
    return items[-capped_limit:]


def clear_log_buffer() -> None:
    """Empties the ring buffer (primarily for test isolation)."""
    with _log_lock:
        _log_buffer.clear()
