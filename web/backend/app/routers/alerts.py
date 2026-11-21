from typing import Optional
from fastapi import APIRouter, HTTPException, Path, Query
from app.models import AlertListResponse
from app.services.alert_engine import alert_engine
from app.validation import validate_alert_id, validate_room

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def get_alerts(room: Optional[str] = Query(None, description="Optional room filter")):
    """
    Evaluates rule-based alerts against active telemetry and returns alert list.
    Optionally scoped to a specific room or 'unassigned'.
    """
    try:
        clean_room = validate_room(room)
        return alert_engine.get_alerts(room=clean_room)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str = Path(..., description="Alert identifier to acknowledge")
):
    """
    Marks an alert as acknowledged.
    """
    try:
        # Validation safety layer: strictly validate alert identifier format
        clean_alert_id = validate_alert_id(alert_id)
        success = alert_engine.acknowledge_alert(clean_alert_id)
        return {"status": "ok", "alert_id": clean_alert_id, "acknowledged": success}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
