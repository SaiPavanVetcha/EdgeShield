import json
import logging
import os
import threading
from typing import Dict, List, Optional
from app.models import AlertThresholds, AlertSettingsResponse
from app.validation import validate_room

logger = logging.getLogger("edgeshield.alert_settings")

# Path to local JSON configuration file (v1 single-node persistent storage)
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
CONFIG_FILE = os.path.join(DATA_DIR, "alert_settings.json")


class AlertSettingsService:
    """
    Manages global and per-room alert thresholds.
    v1 storage: persisted locally to web/backend/app/data/alert_settings.json.
    Note: Thread-safe in-memory cache with JSON backing. Not multi-instance distributed yet.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._global_thresholds = AlertThresholds()
        self._room_thresholds: Dict[str, AlertThresholds] = {}
        self._load()

    def _ensure_data_dir(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)

    def _load(self):
        with self._lock:
            try:
                if os.path.isfile(CONFIG_FILE):
                    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if "global" in data and isinstance(data["global"], dict):
                        self._global_thresholds = AlertThresholds(**data["global"])
                    if "rooms" in data and isinstance(data["rooms"], dict):
                        self._room_thresholds = {
                            room: AlertThresholds(**thresh)
                            for room, thresh in data["rooms"].items()
                            if isinstance(thresh, dict)
                        }
            except Exception as e:
                logger.warning(f"Failed to load alert settings from {CONFIG_FILE}, using defaults: {e}")

    def _save(self):
        self._ensure_data_dir()
        payload = {
            "global": self._global_thresholds.model_dump(),
            "rooms": {room: t.model_dump() for room, t in self._room_thresholds.items()},
        }
        temp_file = f"{CONFIG_FILE}.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        os.replace(temp_file, CONFIG_FILE)

    def get_configured_rooms(self) -> List[str]:
        with self._lock:
            return sorted(list(self._room_thresholds.keys()))

    def get_thresholds_for_room(self, room: Optional[str] = None) -> AlertThresholds:
        """
        Returns active thresholds for a given room, falling back to global defaults.
        """
        with self._lock:
            if room:
                clean_room = room.strip()
                if clean_room in self._room_thresholds:
                    return self._room_thresholds[clean_room].model_copy()
            return self._global_thresholds.model_copy()

    def get_settings(
        self, scope: str = "global", available_rooms: Optional[List[str]] = None
    ) -> AlertSettingsResponse:
        """
        Retrieves threshold configuration and custom flag for a given scope ('global' or specific room).
        """
        clean_scope = scope.strip() if scope else "global"
        with self._lock:
            all_rooms = set(self._room_thresholds.keys())
            if available_rooms:
                for r in available_rooms:
                    if r and r.strip() and r.strip().lower() != "all":
                        all_rooms.add(r.strip())
            sorted_scopes = ["global"] + sorted(list(all_rooms))

            if clean_scope.lower() == "global":
                return AlertSettingsResponse(
                    scope="global",
                    thresholds=self._global_thresholds.model_copy(),
                    is_custom=False,
                    available_scopes=sorted_scopes,
                )

            # Specific room scope
            is_custom = clean_scope in self._room_thresholds
            if is_custom:
                thresh = self._room_thresholds[clean_scope].model_copy()
            else:
                thresh = self._global_thresholds.model_copy()

            return AlertSettingsResponse(
                scope=clean_scope,
                thresholds=thresh,
                is_custom=is_custom,
                available_scopes=sorted_scopes,
            )

    def update_thresholds(
        self, scope: str, thresholds: AlertThresholds, available_rooms: Optional[List[str]] = None
    ) -> AlertSettingsResponse:
        """
        Updates thresholds for global or a specific room scope.
        """
        clean_scope = scope.strip() if scope else "global"
        with self._lock:
            if clean_scope.lower() == "global":
                self._global_thresholds = thresholds.model_copy()
            else:
                # Validate room name format
                validated_room = validate_room(clean_scope)
                if not validated_room:
                    raise ValueError("Cannot set room-scoped alert thresholds for null or empty room name.")
                self._room_thresholds[validated_room] = thresholds.model_copy()
            self._save()

        return self.get_settings(clean_scope, available_rooms=available_rooms)

    def reset_thresholds(
        self, scope: str, available_rooms: Optional[List[str]] = None
    ) -> AlertSettingsResponse:
        """
        Resets thresholds for a scope. If global, resets to factory defaults.
        If a room, removes the custom room override so it falls back to global defaults.
        """
        clean_scope = scope.strip() if scope else "global"
        with self._lock:
            if clean_scope.lower() == "global":
                self._global_thresholds = AlertThresholds()
            else:
                validated_room = validate_room(clean_scope)
                if validated_room and validated_room in self._room_thresholds:
                    del self._room_thresholds[validated_room]
            self._save()

        return self.get_settings(clean_scope, available_rooms=available_rooms)


alert_settings_service = AlertSettingsService()
