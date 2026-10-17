import uvicorn
from contextlib import asynccontextmanager
from config import HOST, PORT
from fastapi import FastAPI
from routes.metrics import router as metrics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("[*] EdgeShield Central Server started successfully.")
    yield
    # Shutdown logic
    print("[*] EdgeShield Central Server shutting down.")


app = FastAPI(
    title="EdgeShield Central Server API",
    description="Backend service for collecting telemetry and environmental metrics.",
    version="1.0.0",
    lifespan=lifespan,
)

# Register routes
app.include_router(metrics_router)


@app.get("/")
def health_check():
    return {"status": "online", "system": "EdgeShield Server Backend"}


if __name__ == "__main__":
    print(f"[*] Starting EdgeShield Server on http://{HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=True)