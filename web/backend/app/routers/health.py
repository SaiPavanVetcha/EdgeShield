from fastapi import APIRouter
from app.config import settings
from app.database import db_manager
from app.models import HealthResponse

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def get_health():
    """
    Checks backend health and Databricks SQL Warehouse connectivity status.
    """
    overall_status = "ok"
    if not settings.is_configured:
        overall_status = "unconfigured"
    elif db_manager.status in ["stopped", "starting"]:
        overall_status = "degraded"
    elif db_manager.status == "error":
        overall_status = "error"

    return HealthResponse(
        status=overall_status,
        warehouse_status=db_manager.status,
        message=db_manager.status_message,
        configured=settings.is_configured,
        catalog=settings.databricks_catalog,
        schema_name=settings.databricks_schema,
        last_query_ms=db_manager.last_latency_ms,
        cached_queries=db_manager.cached_count,
    )


@router.post("/wake-up")
def wake_up_warehouse():
    """
    Initiates asynchronous wake-up ping (SELECT 1) for a sleeping Databricks SQL warehouse.
    """
    if not settings.is_configured:
        return {
            "status": "error",
            "message": "Cannot wake up: Databricks credentials not configured.",
            "warehouse_status": "unconfigured",
        }

    db_manager.wake_up_warehouse_async()
    return {
        "status": "starting",
        "message": "Wake-up signal transmitted. Databricks SQL Warehouse is spinning up...",
        "warehouse_status": db_manager.status,
    }
