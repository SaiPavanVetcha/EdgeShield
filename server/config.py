import os
from dotenv import load_dotenv

load_dotenv()

# Server Settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))

# Databricks Settings
DATABRICKS_HOST = os.getenv("DATABRICKS_HOST")
DATABRICKS_HTTP_PATH = os.getenv("DATABRICKS_HTTP_PATH")
DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")

# Clean host URL if user provided prefix or trailing slashes
if DATABRICKS_HOST and DATABRICKS_HOST.startswith("https://"):
    DATABRICKS_HOST = DATABRICKS_HOST.replace("https://", "")
if DATABRICKS_HOST and DATABRICKS_HOST.endswith("/"):
    DATABRICKS_HOST = DATABRICKS_HOST.rstrip("/")

# Durable Spool & Batching Settings
SPOOL_DIR = os.getenv("SPOOL_DIR", "./spool")
FLUSH_INTERVAL_SECONDS = float(os.getenv("FLUSH_INTERVAL_SECONDS", "5.0"))
FLUSH_MAX_RECORDS = int(os.getenv("FLUSH_MAX_RECORDS", os.getenv("BATCH_SIZE", "20")))
BATCH_SIZE = FLUSH_MAX_RECORDS
SPOOL_MAX_RECORDS = int(os.getenv("SPOOL_MAX_RECORDS", "10000"))

# Durable Spool & Batching Settings
SPOOL_DIR = os.getenv("SPOOL_DIR", "./spool")
FLUSH_INTERVAL_SECONDS = float(os.getenv("FLUSH_INTERVAL_SECONDS", "5.0"))
FLUSH_MAX_RECORDS = int(os.getenv("FLUSH_MAX_RECORDS", os.getenv("BATCH_SIZE", "20")))
BATCH_SIZE = FLUSH_MAX_RECORDS
SPOOL_MAX_RECORDS = int(os.getenv("SPOOL_MAX_RECORDS", "10000"))
