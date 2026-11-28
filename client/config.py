import os
import socket
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Server Settings
SERVER_IP = os.getenv("SERVER_IP", "127.0.0.1")
SERVER_PORT = os.getenv("SERVER_PORT", "5000")
SERVER_ENDPOINT = os.getenv("SERVER_ENDPOINT", "/metrics")
DEVICE_ID = os.getenv("DEVICE_ID", f"PC-{socket.gethostname()}")
ROOM = os.getenv("ROOM", "")

SERVER_URL = f"http://{SERVER_IP}:{SERVER_PORT}{SERVER_ENDPOINT}"

# Sampling Cadence
SAMPLING_INTERVAL = int(os.getenv("SAMPLING_INTERVAL_SECONDS", "10"))
SAMPLING_INTERVAL_SECONDS = SAMPLING_INTERVAL

# Durable Spool & Batching Settings
FLUSH_INTERVAL_SECONDS = int(os.getenv("FLUSH_INTERVAL_SECONDS", "60"))
FLUSH_INTERVAL = FLUSH_INTERVAL_SECONDS
FLUSH_MAX_RECORDS = int(os.getenv("FLUSH_MAX_RECORDS", "20"))
SPOOL_MAX_RECORDS = int(os.getenv("SPOOL_MAX_RECORDS", "5000"))
SPOOL_DIR = os.getenv("SPOOL_DIR", os.path.join(BASE_DIR, "spool"))
if not os.path.isabs(SPOOL_DIR):
    SPOOL_DIR = os.path.abspath(os.path.join(BASE_DIR, SPOOL_DIR))

# Logging Settings
LOG_DIR = os.getenv("LOG_DIR", os.path.join(BASE_DIR, "logs"))
if not os.path.isabs(LOG_DIR):
    LOG_DIR = os.path.abspath(os.path.join(BASE_DIR, LOG_DIR))

LOG_FILE = os.getenv("LOG_FILE", os.path.join(LOG_DIR, "client.log"))
if not os.path.isabs(LOG_FILE):
    LOG_FILE = os.path.abspath(os.path.join(LOG_DIR, os.path.basename(LOG_FILE)))
