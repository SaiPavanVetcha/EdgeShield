from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.models import KPISummaryResponse
from app.services.databricks_service import databricks_service
from app.validation import validate_device_id, validate_room, validate_timestamp

router = APIRouter(prefix="/api/kpis", tags=["kpis"])


@router.get("", response_model=KPISummaryResponse)
def get_kpis(
    device_id: str = Query("all", description="Target device ID or 'all' for fleet"),
    from_time: Optional[str] = Query(None, alias="from", description="Start timestamp (ISO or YYYY-MM-DD HH:MM:SS)"),
    to_time: Optional[str] = Query(None, alias="to", description="End timestamp (ISO or YYYY-MM-DD HH:MM:SS)"),
    room: Optional[str] = Query(None, description="Optional room filter when device_id is 'all'"),
):
    """
    Returns latest and aggregated KPIs for CPU, RAM, Disk, Battery, Temperature, Humidity.
    When device_id=all, returns fleet statistics (optionally filtered by room).
    When a specific device is selected, returns that device's KPIs.
    If no data exists for a metric, available=false is returned.
    """
    try:
        clean_device_id = validate_device_id(device_id)
        clean_room = validate_room(room)
        now_utc = datetime.now(timezone.utc)
        start_ts = validate_timestamp(from_time, now_utc - timedelta(hours=24))
        end_ts = validate_timestamp(to_time, now_utc)

        return databricks_service.get_kpis(device_id=clean_device_id, from_ts=start_ts, to_ts=end_ts, room=clean_room)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
