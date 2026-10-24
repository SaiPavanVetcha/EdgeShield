import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import devices, kpis, timeseries, alerts, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("edgeshield.main")

app = FastAPI(
    title="EdgeShield Monitoring Backend",
    description="Clean, production-grade telemetry API reading directly from Databricks Gold Layer",
    version="1.0.0",
)

# CORS Middleware
origins = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(devices.router)
app.include_router(kpis.router)
app.include_router(timeseries.router)
app.include_router(alerts.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {
        "service": "EdgeShield Telemetry API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "catalog": settings.databricks_catalog,
        "schema": settings.databricks_schema,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
