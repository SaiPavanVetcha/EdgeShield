from database import insert_telemetry_to_databricks
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

router = APIRouter()


@router.post("/metrics")
async def receive_metrics(request: Request, background_tasks: BackgroundTasks):
    """Receives client telemetry JSON payloads and writes them asynchronously to Databricks."""
    try:
        data = await request.json()

        # Only device_id is required now (timestamp is set by the server)
        if not data.get("device_id"):
            raise HTTPException(
                status_code=400,
                detail="Invalid payload: missing device_id",
            )

        # Offload Databricks I/O write operation to a background thread
        background_tasks.add_task(insert_telemetry_to_databricks, data)

        return {
            "status": "success",
            "message": "Telemetry queued for Databricks persistence",
            "device_id": data.get("device_id"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process telemetry payload: {str(e)}"
        )