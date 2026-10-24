from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.models import TimeseriesResponse
from app.services.databricks_service import databricks_service

router = APIRouter(prefix="/api/timeseries", tags=["timeseries"])


def normalize_ts(ts: Optional[str], default_dt: datetime) -> str:
    if not ts:
        return default_dt.strftime("%Y-%m-%d %H:%M:%S")
    clean = ts.replace("T", " ").replace("Z", "").split(".")[0].strip()
    return clean


@router.get("", response_model=TimeseriesResponse)
def get_timeseries(
    device_id: str = Query("all", description="Target device ID or 'all' for fleet"),
    metric: str = Query("cpu", description="cpu | ram | disk | battery | temperature | humidity | environment"),
    from_time: Optional[str] = Query(None, alias="from", description="Start timestamp"),
    to_time: Optional[str] = Query(None, alias="to", description="End timestamp"),
):
    """
    Returns time series points downsampled cleanly for the requested metric.
    """
    try:
        now_utc = datetime.now(timezone.utc)
        start_ts = normalize_ts(from_time, now_utc - timedelta(hours=24))
        end_ts = normalize_ts(to_time, now_utc)

        return databricks_service.get_timeseries(
            metric=metric,
            device_id=device_id,
            from_ts=start_ts,
            to_ts=end_ts,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
