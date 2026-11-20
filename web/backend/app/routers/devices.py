from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import DeviceListResponse
from app.services.databricks_service import databricks_service
from app.validation import validate_room

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=DeviceListResponse)
def get_devices(room: Optional[str] = Query(None, description="Optional room filter")):
    """
    Returns list of edge devices populated from dim_device,
    along with calculated status (online/warning/offline), capabilities, and room metadata.
    """
    try:
        clean_room = validate_room(room)
        return databricks_service.get_devices(room=clean_room)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
