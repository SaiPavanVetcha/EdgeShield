from fastapi import APIRouter, HTTPException, Path
from app.models import AlertListResponse
from app.services.alert_engine import alert_engine
from app.validation import validate_alert_id

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def get_alerts():
    """
    Evaluates rule-based alerts against active telemetry and returns alert list.
    """
    try:
        return alert_engine.get_alerts()
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
