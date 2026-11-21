import logging
from device_registry import upsert_from_request
from runtime_stats import record_received
from spool import enqueue
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("edgeshield.metrics")
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

        # Durably append payload to SQLite spool and increment process telemetry counter
        enqueue(data)
        record_received(1)

        # Extract client IP from X-Forwarded-For or direct client connection
        client_ip = "unknown"
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host

        # Update and persist device registry
        try:
            upsert_from_request(data, client_ip)
        except Exception as reg_err:
            logger.error(
                "Failed to upsert device_registry for device_id=%s: %s",
                data.get("device_id"),
                reg_err,
                exc_info=True,
            )

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
