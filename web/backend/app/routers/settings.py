import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import (
    AlertSettingsResponse,
    UpdateAlertThresholdsRequest,
    ResetAlertThresholdsRequest,
)
from app.services.alert_settings_service import alert_settings_service
from app.services.databricks_service import databricks_service
from app.validation import validate_room

logger = logging.getLogger("edgeshield.settings_router")

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_active_rooms():
    try:
        dev_res = databricks_service.get_devices()
        return [d.room for d in dev_res.devices if d.room and d.room.strip()]
    except Exception:
        return []


@router.get("/alerts", response_model=AlertSettingsResponse)
def get_alert_settings(
    scope: Optional[str] = Query("global", description="Scope: 'global' or a room name")
):
    """
    Retrieves alert thresholds for the requested scope ('global' or a specific room).
    """
    try:
        clean_scope = scope.strip() if scope else "global"
        if clean_scope.lower() != "global":
            validated = validate_room(clean_scope)
            clean_scope = validated if validated else "global"
        active_rooms = _get_active_rooms()
        return alert_settings_service.get_settings(clean_scope, available_rooms=active_rooms)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts", response_model=AlertSettingsResponse)
def update_alert_settings(req: UpdateAlertThresholdsRequest):
    """
    Updates alert thresholds for 'global' or a specific room scope.
    Persisted to local JSON storage on backend (v1).
    """
    try:
        clean_scope = req.scope.strip() if req.scope else "global"
        if clean_scope.lower() != "global":
            validated = validate_room(clean_scope)
            if not validated:
                raise HTTPException(status_code=400, detail="Invalid room name for alert settings scope.")
            clean_scope = validated
        active_rooms = _get_active_rooms()
        return alert_settings_service.update_thresholds(
            clean_scope, req.thresholds, available_rooms=active_rooms
        )
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/reset", response_model=AlertSettingsResponse)
def reset_alert_settings(req: ResetAlertThresholdsRequest):
    """
    Resets alert thresholds for 'global' or removes room-specific override.
    """
    try:
        clean_scope = req.scope.strip() if req.scope else "global"
        if clean_scope.lower() != "global":
            validated = validate_room(clean_scope)
            clean_scope = validated if validated else "global"
        active_rooms = _get_active_rooms()
        return alert_settings_service.reset_thresholds(clean_scope, available_rooms=active_rooms)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
