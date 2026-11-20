import json
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from config import BASE_DIR, DATABRICKS_HOST, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN

DATA_DIR = os.path.join(BASE_DIR, "data")
RUNTIME_CONFIG_PATH = os.path.join(DATA_DIR, "runtime_config.json")

_config_lock = threading.Lock()
ALLOWED_STORAGE_MODES = {"local", "databricks"}


def _read_file_config() -> Dict[str, Any]:
    """Reads runtime config from JSON file if present and valid."""
    if not os.path.isfile(RUNTIME_CONFIG_PATH):
        return {}
    try:
        with open(RUNTIME_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def is_databricks_configured() -> bool:
    """Checks whether all Databricks connection credentials are set."""
    host = (DATABRICKS_HOST or "").strip()
    path = (DATABRICKS_HTTP_PATH or "").strip()
    token = (DATABRICKS_TOKEN or "").strip()
    return bool(host and path and token)


def get_storage_mode() -> str:
    """
    Resolves the operational storage mode in precedence order:
    1. Runtime config file (server/data/runtime_config.json)
    2. Environment variable STORAGE_MODE
    3. Default: "databricks"
    """
    with _config_lock:
        file_cfg = _read_file_config()
        mode_file = file_cfg.get("storage_mode")
        if mode_file and str(mode_file).strip().lower() in ALLOWED_STORAGE_MODES:
            return str(mode_file).strip().lower()

    env_mode = os.getenv("STORAGE_MODE", "").strip().lower()
    if env_mode in ALLOWED_STORAGE_MODES:
        return env_mode

    return "databricks"


def set_storage_mode(mode: str) -> str:
    """
    Persists a new storage mode ("local" or "databricks") to server/data/runtime_config.json.
    Raises ValueError if mode is invalid.
    """
    clean_mode = str(mode).strip().lower()
    if clean_mode not in ALLOWED_STORAGE_MODES:
        raise ValueError(f"Invalid storage mode '{mode}'. Allowed: {sorted(ALLOWED_STORAGE_MODES)}")

    with _config_lock:
        os.makedirs(DATA_DIR, exist_ok=True)
        current = _read_file_config()
        current["storage_mode"] = clean_mode
        current["updated_at_utc"] = datetime.now(timezone.utc).isoformat()

        temp_path = RUNTIME_CONFIG_PATH + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        os.replace(temp_path, RUNTIME_CONFIG_PATH)

    return clean_mode
