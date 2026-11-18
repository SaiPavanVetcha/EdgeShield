import os
import socket
from dotenv import load_dotenv

load_dotenv()

# Server Settings
SERVER_IP = os.getenv("SERVER_IP", "127.0.0.1")
SERVER_PORT = os.getenv("SERVER_PORT", "5000")
SERVER_ENDPOINT = os.getenv("SERVER_ENDPOINT", "/metrics")
DEVICE_ID = os.getenv("DEVICE_ID", f"PC-{socket.gethostname()}")

SERVER_URL = f"http://{SERVER_IP}:{SERVER_PORT}{SERVER_ENDPOINT}"

# Sampling Cadence
SAMPLING_INTERVAL = int(os.getenv("SAMPLING_INTERVAL_SECONDS", "10"))
SAMPLING_INTERVAL_SECONDS = SAMPLING_INTERVAL

# Durable Spool & Batching Settings
FLUSH_INTERVAL_SECONDS = int(os.getenv("FLUSH_INTERVAL_SECONDS", "60"))
FLUSH_INTERVAL = FLUSH_INTERVAL_SECONDS
FLUSH_MAX_RECORDS = int(os.getenv("FLUSH_MAX_RECORDS", "20"))
SPOOL_MAX_RECORDS = int(os.getenv("SPOOL_MAX_RECORDS", "5000"))
SPOOL_DIR = os.getenv("SPOOL_DIR", "./spool")
