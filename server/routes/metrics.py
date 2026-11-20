from device_registry import upsert_from_request
from spool import enqueue
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.post("/metrics")
async def receive_metrics(request: Request):
    """Receives client telemetry JSON payloads and enqueues them into durable SQLite spool."""
    try:
        data = await request.json()

        # Only device_id is required
        if not data.get("device_id"):
            raise HTTPException(
                status_code=400,
                detail="Invalid payload: missing device_id",
            )

        # Durably append payload to SQLite spool
        enqueue(data)

        # Update in-memory device registry with client host IP
        client_ip = request.client.host if request.client else "unknown"
        try:
            upsert_from_request(data, client_ip)
        except Exception:
            pass

        response = {
            "status": "success",
            "message": "Telemetry queued for Databricks persistence",
            "device_id": data.get("device_id"),
        }
        if data.get("room"):
            response["room"] = data.get("room")

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process telemetry payload: {str(e)}"
        )
