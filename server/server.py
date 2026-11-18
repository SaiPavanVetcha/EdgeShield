import uvicorn
from contextlib import asynccontextmanager
from config import (
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    HOST,
    PORT,
    SPOOL_MAX_RECORDS,
)
from database import (
    flush_spool_to_databricks,
    get_last_flush_status,
    start_flush_worker,
    stop_flush_worker,
)
from fastapi import FastAPI
from routes.metrics import router as metrics_router
from spool import count


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("[*] EdgeShield Central Server initializing...")
    pending = count()
    if pending > 0:
        print(f"[*] Server startup: found {pending} pending spool record(s). Attempting initial flush to Databricks...")
        flush_spool_to_databricks()

    start_flush_worker()
    print("[*] EdgeShield Central Server started successfully.")
    yield
    # Shutdown logic
    print("[*] EdgeShield Central Server shutting down...")
    stop_flush_worker()
    print("[*] EdgeShield Central Server stopped.")


app = FastAPI(
    title="EdgeShield Central Server API",
    description="Backend service for collecting telemetry and environmental metrics.",
    version="1.1.0",
    lifespan=lifespan,
)

# Register routes
app.include_router(metrics_router)


@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "EdgeShield Server Backend",
        "spool": {
            "pending": count(),
            "max_records": SPOOL_MAX_RECORDS,
            "flush_interval_seconds": FLUSH_INTERVAL_SECONDS,
            "flush_max_records": FLUSH_MAX_RECORDS,
            "last_flush": get_last_flush_status(),
        },
    }


if __name__ == "__main__":
    print(f"[*] Starting EdgeShield Server on http://{HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)
