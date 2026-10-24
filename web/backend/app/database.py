import time
import logging
import threading
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from decimal import Decimal
import databricks.sql
from app.config import settings

logger = logging.getLogger("edgeshield.database")
logging.basicConfig(level=logging.INFO)


class DatabaseManager:
    def __init__(self):
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._cache_lock = threading.Lock()
        self._status: str = "unconfigured" if not settings.is_configured else "online"
        self._status_message: str = "Ready" if settings.is_configured else "Databricks credentials not configured"
        self._last_latency_ms: Optional[float] = None
        self._is_waking_up: bool = False
        self._wake_lock = threading.Lock()

    @property
    def status(self) -> str:
        if not settings.is_configured:
            return "unconfigured"
        if self._is_waking_up:
            return "starting"
        return self._status

    @property
    def status_message(self) -> str:
        if not settings.is_configured:
            return "Databricks credentials not configured in environment"
        if self._is_waking_up:
            return "Warehouse is starting up... Please wait 15-45 seconds"
        return self._status_message

    @property
    def last_latency_ms(self) -> Optional[float]:
        return self._last_latency_ms

    @property
    def cached_count(self) -> int:
        with self._cache_lock:
            return len(self._cache)

    def _get_from_cache(self, key: str, max_age: Optional[int] = None) -> Optional[Any]:
        with self._cache_lock:
            if key not in self._cache:
                return None
            timestamp, data = self._cache[key]
            age = time.time() - timestamp
            ttl = max_age if max_age is not None else settings.cache_ttl_seconds
            if age <= ttl:
                return data
            return None

    def _get_stale_cache(self, key: str) -> Optional[Any]:
        """Return cached data even if expired (used as fallback when warehouse is stopped)"""
        with self._cache_lock:
            if key in self._cache:
                return self._cache[key][1]
            return None

    def _set_cache(self, key: str, data: Any):
        with self._cache_lock:
            self._cache[key] = (time.time(), data)

    def _classify_error(self, err: Exception) -> str:
        msg = str(err).lower()
        if any(term in msg for term in ["warehouse is stopped", "warehouse stopped", "status: stopped", "state: stopped"]):
            return "stopped"
        if any(term in msg for term in ["warehouse is starting", "state: starting", "temporarily_unavailable", "503"]):
            return "starting"
        if any(term in msg for term in ["timed out", "timeout", "socket timeout"]):
            return "stopped"  # Usually stopped warehouse causing connection timeout
        if any(term in msg for term in ["invalid access token", "unauthenticated", "401", "403"]):
            return "error"
        return "error"

    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
        use_cache: bool = True,
    ) -> Tuple[List[Dict[str, Any]], bool, str]:
        """
        Executes a SQL query against Databricks.
        Returns: (results_list, is_cached, warehouse_status)
        """
        if not settings.is_configured:
            return [], False, "unconfigured"

        # Check in-memory cache first if requested
        if use_cache and cache_key:
            cached_data = self._get_from_cache(cache_key)
            if cached_data is not None:
                return cached_data, True, self.status

        start_time = time.time()
        try:
            with databricks.sql.connect(
                server_hostname=settings.clean_host,
                http_path=settings.databricks_http_path,
                access_token=settings.databricks_token,
                _timeout=settings.query_timeout_seconds,
            ) as connection:
                with connection.cursor() as cursor:
                    if params:
                        cursor.execute(query, params)
                    else:
                        cursor.execute(query)

                    columns = [col[0].lower() for col in cursor.description] if cursor.description else []
                    rows = cursor.fetchall()
                    results: List[Dict[str, Any]] = []

                    for row in rows:
                        row_dict = {}
                        for idx, col in enumerate(columns):
                            val = row[idx]
                            # Clean serialize data types
                            if isinstance(val, Decimal):
                                val = float(val)
                            elif isinstance(val, datetime):
                                val = val.isoformat()
                            row_dict[col] = val
                        results.append(row_dict)

            latency = (time.time() - start_time) * 1000
            self._last_latency_ms = round(latency, 2)
            self._status = "online"
            self._status_message = f"Connected ({self._last_latency_ms}ms)"
            self._is_waking_up = False

            if cache_key:
                self._set_cache(cache_key, results)

            return results, False, "online"

        except Exception as e:
            logger.warning(f"Databricks query error: {e}")
            classification = self._classify_error(e)
            self._status = classification
            if classification == "stopped":
                self._status_message = "Databricks SQL Warehouse is currently stopped (Auto-stop idle)"
            elif classification == "starting":
                self._status_message = "Databricks SQL Warehouse is starting up"
            else:
                self._status_message = f"Connection error: {str(e)[:120]}"

            # Fallback to stale cache if available
            if cache_key:
                stale_data = self._get_stale_cache(cache_key)
                if stale_data is not None:
                    logger.info(f"Serving stale cache for {cache_key} while warehouse is {classification}")
                    return stale_data, True, self._status

            return [], False, self._status

    def wake_up_warehouse_async(self):
        """Triggers a background wake-up ping if not already in progress"""
        with self._wake_lock:
            if self._is_waking_up:
                return
            self._is_waking_up = True
            self._status = "starting"
            self._status_message = "Warehouse wake-up initiated..."

        def _wake():
            try:
                logger.info("Sending wake-up ping (SELECT 1) to Databricks SQL Warehouse...")
                with databricks.sql.connect(
                    server_hostname=settings.clean_host,
                    http_path=settings.databricks_http_path,
                    access_token=settings.databricks_token,
                    _timeout=90,
                ) as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1 AS ready")
                        cur.fetchone()
                self._status = "online"
                self._status_message = "Warehouse online and responsive"
                logger.info("Databricks SQL Warehouse is now ONLINE")
            except Exception as e:
                logger.error(f"Failed to wake warehouse: {e}")
                classification = self._classify_error(e)
                self._status = classification
                self._status_message = f"Wake up failed: {str(e)[:120]}"
            finally:
                self._is_waking_up = False

        thread = threading.Thread(target=_wake, daemon=True)
        thread.start()


db_manager = DatabaseManager()
