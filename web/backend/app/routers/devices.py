from fastapi import APIRouter, HTTPException
from app.models import DeviceListResponse
from app.services.databricks_service import databricks_service

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=DeviceListResponse)
def get_devices():
    """
    Returns list of edge devices populated from dim_device,
    along with calculated status (online/warning/offline) and capabilities.
    """
    try:
        return databricks_service.get_devices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
