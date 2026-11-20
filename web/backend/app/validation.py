import re
from datetime import datetime
from typing import Optional, Any
from fastapi import HTTPException

# Safe regex pattern for device IDs: alphanumeric, hyphen, underscore, dot (1-64 chars)
_DEVICE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{1,64}$")

# Safe regex pattern for room tags: alphanumeric, hyphen, underscore, dot, spaces (1-64 chars)
_ROOM_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.\s]{1,64}$")

# Safe regex pattern for server-resolved internal device keys (alphanumeric, hyphen, underscore)
_DEVICE_KEY_REGEX = re.compile(r"^[a-zA-Z0-9_\-]{1,64}$")

# Strict allowlist of supported metrics for timeseries and KPI queries
ALLOWED_METRICS = {
    "cpu",
    "ram",
    "disk",
    "battery",
    "temperature",
    "humidity",
    "environment",
}

# Strict allowlist of supported time truncation grains
ALLOWED_TRUNC_GRAINS = {"minute", "hour", "day"}


def validate_device_id(device_id: Optional[str]) -> str:
    """
    Validates and sanitizes a device_id parameter.
    Allows 'all' (fleet view) or a strictly formatted device identifier.
    Raises HTTPException(400) if format is invalid.
    """
    if not device_id or device_id.strip().lower() == "all":
        return "all"
    clean = device_id.strip()
    if not _DEVICE_ID_REGEX.match(clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid device_id. Must be between 1 and 64 characters (alphanumeric, hyphens, underscores, dots only).",
        )
    return clean


def validate_room(room: Optional[str]) -> Optional[str]:
    """
    Validates and sanitizes a room parameter.
    Allows None, empty, 'all', or a strictly formatted room name.
    Raises HTTPException(400) if format is invalid.
    """
    if not room or room.strip().lower() == "all":
        return None
    clean = room.strip()
    if not _ROOM_REGEX.match(clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid room parameter. Must be between 1 and 64 characters (alphanumeric, spaces, hyphens, underscores, dots only).",
        )
    return clean


def validate_device_key(device_key: Any) -> str:
    """
    Validates server-side resolved device_key.
    """
    clean = str(device_key).strip()
    if not _DEVICE_KEY_REGEX.match(clean):
        raise ValueError(f"Invalid resolved device_key format: '{clean}'")
    return clean


def validate_metric(metric: Optional[str]) -> str:
    """
    Validates metric name against strict allowlist.
    Raises HTTPException(400) if metric is not supported.
    """
    if not metric:
        return "cpu"
    clean = metric.strip().lower()
    if clean not in ALLOWED_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric '{metric}'. Allowed metrics: {sorted(ALLOWED_METRICS)}",
        )
    return clean


def validate_trunc_grain(grain: Optional[str]) -> str:
    """
    Validates truncation grain against strict allowlist.
    """
    if not grain:
        return "minute"
    clean = grain.strip().lower()
    if clean not in ALLOWED_TRUNC_GRAINS:
        return "minute"
    return clean


def validate_timestamp(ts: Optional[str], default_dt: Optional[datetime] = None) -> str:
    """
    Strictly validates and formats a timestamp string.
    Supports ISO-8601, YYYY-MM-DD HH:MM:SS, YYYY-MM-DD, or 'all'.
    Returns a standardized 'YYYY-MM-DD HH:MM:SS' string.
    Raises HTTPException(400) if timestamp is malformed.
    """
    if not ts or not str(ts).strip():
        if default_dt is not None:
            return default_dt.strftime("%Y-%m-%d %H:%M:%S")
        return ""

    clean = str(ts).strip()
    if clean.lower() == "all":
        return "2020-01-01 00:00:00"

    # Quick rejection of obvious SQL injection characters
    if any(char in clean for char in ["'", '"', ";", "--", "/*", "*/"]):
        raise HTTPException(status_code=400, detail="Malformed timestamp: forbidden characters detected.")

    # Try parsing ISO 8601 format
    parsed_dt: Optional[datetime] = None
    try:
        iso_clean = clean.replace("Z", "+00:00")
        parsed_dt = datetime.fromisoformat(iso_clean)
    except Exception:
        pass

    if not parsed_dt:
        # Try parsing standard SQL timestamp representations
        normalized = clean.replace("T", " ").split(".")[0].strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                parsed_dt = datetime.strptime(normalized, fmt)
                break
            except Exception:
                continue

    if not parsed_dt:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timestamp format: '{ts}'. Expected ISO-8601 or YYYY-MM-DD HH:MM:SS.",
        )

    return parsed_dt.strftime("%Y-%m-%d %H:%M:%S")
