import os
import sys
import logging
import uvicorn
from contextlib import asynccontextmanager

# Ensure server package directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

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
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from log_buffer import attach_log_buffer
from routes.console_api import router as console_router, get_console_status
from routes.console_views import render_console_html, render_landing_html
from routes.metrics import router as metrics_router
from runtime_config import get_storage_mode
from spool import count

# Attach in-memory ring buffer handler to root logger
attach_log_buffer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    mode = get_storage_mode()
    logging.info(f"EdgeShield Central Server initializing (storage_mode={mode})...")
    pending = count()
    if pending > 0 and mode == "databricks":
        logging.info(f"Server startup: found {pending} pending spool record(s). Attempting initial flush to Databricks...")
        flush_spool_to_databricks()

    start_flush_worker()
    logging.info("EdgeShield Central Server started successfully.")
    yield
    # Shutdown logic
    logging.info("EdgeShield Central Server shutting down...")
    stop_flush_worker()
    logging.info("EdgeShield Central Server stopped.")


app = FastAPI(
    title="EdgeShield Central Server API",
    description="Backend service for collecting telemetry and environmental metrics.",
    version="1.1.0",
    lifespan=lifespan,
)

# Register API routes
app.include_router(metrics_router)
app.include_router(console_router)

# Static assets directory for built Server Console SPA
CONSOLE_STATIC_DIR = os.path.join(BASE_DIR, "static", "console")
CONSOLE_ASSETS_DIR = os.path.join(CONSOLE_STATIC_DIR, "assets")
os.makedirs(CONSOLE_ASSETS_DIR, exist_ok=True)

# Mount Vite static assets for the React SPA
app.mount("/console/assets", StaticFiles(directory=CONSOLE_ASSETS_DIR), name="console_assets")


def _build_health_json():
    """Generates standard JSON health check structure."""
    return {
        "status": "online",
        "system": "EdgeShield Server Backend",
        "storage_mode": get_storage_mode(),
        "spool": {
            "pending": count(),
            "max_records": SPOOL_MAX_RECORDS,
            "flush_interval_seconds": FLUSH_INTERVAL_SECONDS,
            "flush_max_records": FLUSH_MAX_RECORDS,
            "last_flush": get_last_flush_status(),
        },
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    """JSON health endpoint reporting service online state and spool stats."""
    return _build_health_json()


@app.get("/console", response_class=HTMLResponse)
@app.get("/console/{full_path:path}", response_class=HTMLResponse)
def console_view(full_path: str = ""):
    """
    Ops Console UI displaying registered devices, spool queue, and logs.
    Serves the high-fidelity React SPA build when present, falling back to embedded HTML view.
    """
    index_file = os.path.join(CONSOLE_STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content=render_console_html())


@app.get("/")
def root_endpoint(request: Request):
    """
    Root endpoint:
    - Serves clean HTML landing page by default for browsers.
    - Serves JSON health if the client explicitly requests application/json without text/html.
    """
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return JSONResponse(content=_build_health_json())

    status_data = get_console_status()
    html_content = render_landing_html(status_data)
    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    print(f"[*] Starting EdgeShield Server on http://{HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)
