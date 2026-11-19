from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import DeviceListResponse
from app.services.databricks_service import databricks_service

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=DeviceListResponse)
def get_devices(room: Optional[str] = Query(None, description="Optional room filter")):
    """
    Returns list of edge devices populated from dim_device,
    along with calculated status (online/warning/offline), capabilities, and room metadata.
    """
    try:
        return databricks_service.get_devices(room=room)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
