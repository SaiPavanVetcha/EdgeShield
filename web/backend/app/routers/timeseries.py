from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.models import TimeseriesResponse
from app.services.databricks_service import databricks_service
from app.validation import validate_device_id, validate_room, validate_timestamp, validate_metric

router = APIRouter(prefix="/api/timeseries", tags=["timeseries"])


@router.get("", response_model=TimeseriesResponse)
def get_timeseries(
    device_id: str = Query("all", description="Target device ID or 'all' for fleet"),
    metric: str = Query("cpu", description="cpu | ram | disk | battery | temperature | humidity | environment"),
    from_time: Optional[str] = Query(None, alias="from", description="Start timestamp"),
    to_time: Optional[str] = Query(None, alias="to", description="End timestamp"),
    room: Optional[str] = Query(None, description="Optional room filter when device_id is 'all'"),
):
    """
    Returns time series points downsampled cleanly for the requested metric.
    """
    try:
        clean_device_id = validate_device_id(device_id)
        clean_metric = validate_metric(metric)
        clean_room = validate_room(room)
        now_utc = datetime.now(timezone.utc)
        start_ts = validate_timestamp(from_time, now_utc - timedelta(hours=24))
        end_ts = validate_timestamp(to_time, now_utc)

        return databricks_service.get_timeseries(
            metric=clean_metric,
            device_id=clean_device_id,
            from_ts=start_ts,
            to_ts=end_ts,
            room=clean_room,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
