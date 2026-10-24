import os
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Search for .env in current directory or web/backend or root
env_paths = [
    Path.cwd() / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]
for p in env_paths:
    if p.exists():
        load_dotenv(p)
        break
else:
    load_dotenv()


class Settings(BaseModel):
    # Databricks
    databricks_host: str = Field(default_factory=lambda: os.getenv("DATABRICKS_HOST", ""))
    databricks_http_path: str = Field(default_factory=lambda: os.getenv("DATABRICKS_HTTP_PATH", ""))
    databricks_token: str = Field(default_factory=lambda: os.getenv("DATABRICKS_TOKEN", ""))
    databricks_catalog: str = Field(default_factory=lambda: os.getenv("DATABRICKS_CATALOG", "edgeshield_lakehouse"))
    databricks_schema: str = Field(default_factory=lambda: os.getenv("DATABRICKS_SCHEMA", "gold"))

    # Cache & Resiliency
    cache_ttl_seconds: int = Field(default_factory=lambda: int(os.getenv("CACHE_TTL_SECONDS", "180")))
    query_timeout_seconds: int = Field(default_factory=lambda: int(os.getenv("QUERY_TIMEOUT_SECONDS", "45")))

    # Server & CORS
    host: str = Field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,*").split(",")
            if origin.strip()
        ]
    )

    @property
    def clean_host(self) -> str:
        """Strip http/https and trailing slashes from host for databricks connector"""
        host = self.databricks_host.strip()
        if host.startswith("https://"):
            host = host[len("https://"):]
        elif host.startswith("http://"):
            host = host[len("http://"):]
        return host.rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.databricks_host and self.databricks_http_path and self.databricks_token)

    @property
    def gold_table_prefix(self) -> str:
        return f"{self.databricks_catalog}.{self.databricks_schema}"


settings = Settings()
