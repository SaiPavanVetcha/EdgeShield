from typing import Any, Dict
from config import HOST, PORT
from runtime_config import get_storage_mode


def render_landing_html(status_data: Dict[str, Any]) -> str:
    """Renders the upgraded product marketing landing page for EdgeShield Central Server."""
    spool_pending = status_data.get("spool", {}).get("pending", 0)
    devices = status_data.get("devices", {})
    devices_online = devices.get("online", 0)
    devices_total = devices.get("total", 0)
    storage_mode = status_data.get("storage_mode", get_storage_mode())
    uptime_sec = status_data.get("uptime_seconds", 0)
    advertised_url = status_data.get("advertised_url", f"http://{HOST}:{PORT}")
    advertised_host = status_data.get("advertised_host", HOST)
    listen_host = status_data.get("listen_host", HOST)
    listen_port = status_data.get("listen_port", PORT)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeShield Central Server &bull; Edge Ingestion &amp; Lakehouse Streaming</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Cpath d='M16 3L5 7.2v8.5c0 7.2 4.7 11.8 11 13.3 6.3-1.5 11-6.1 11-13.3V7.2L16 3z' fill='%23091122' stroke='%2338bdf8' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M9 16.2h3.2l2-3.8 3.6 7.4 2-3.6H23' stroke='%2338bdf8' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%2338bdf8'/%3E%3C/svg%3E" />
  <style>
    :root {{
      --bg-page: #080c14;
      --bg-card: #0f172a;
      --bg-subtle: #141e33;
      --border-subtle: #1e293b;
      --border-medium: #334155;
      --border-accent: #38bdf8;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --green: #22c55e;
      --green-glow: rgba(34, 197, 94, 0.15);
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.15);
      --purple: #a855f7;
      --purple-glow: rgba(168, 85, 247, 0.15);
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: var(--font-sans);
      background-color: var(--bg-page);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 65%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
    }}
    .container {{
      max-width: 920px;
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2.75rem;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75);
    }}
    .header {{
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 0.85rem;
    }}
    .brand-wrap {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}
    .wordmark {{
      font-size: 2.15rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
    }}
    .wordmark-edge {{
      color: #ffffff;
    }}
    .wordmark-shield {{
      color: var(--accent);
    }}
    .badge-ver {{
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--accent);
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-weight: 600;
      vertical-align: middle;
      margin-left: 0.35rem;
    }}
    .tagline {{
      color: var(--accent);
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-top: 0.3rem;
    }}
    .subtitle {{
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
      margin-top: 0.75rem;
      margin-bottom: 2rem;
    }}
    /* Architecture Flow Strip: Edge -> Server -> Lakehouse -> Monitor */
    .pipeline-section {{
      margin-bottom: 2rem;
    }}
    .section-label {{
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      margin-bottom: 0.85rem;
    }}
    .pipeline-strip {{
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
    }}
    .pipe-node {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}
    .pipe-badge {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: var(--accent);
      font-size: 0.95rem;
      font-weight: 700;
    }}
    .pipe-active {{
      background: rgba(56, 189, 248, 0.25);
      border-color: var(--accent);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }}
    .pipe-content {{
      display: flex;
      flex-direction: column;
    }}
    .pipe-title {{
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-main);
    }}
    .pipe-sub {{
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }}
    .pipe-arrow {{
      color: var(--text-dim);
      font-size: 1.1rem;
      font-weight: 700;
    }}
    /* Operational Pills */
    .status-section {{
      margin-bottom: 2rem;
    }}
    .pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }}
    .pill {{
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.5rem 0.95rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid transparent;
      background: var(--bg-subtle);
    }}
    .pill-green {{
      background: var(--green-glow);
      color: var(--green);
      border-color: rgba(34, 197, 94, 0.3);
    }}
    .pill-amber {{
      background: var(--amber-glow);
      color: var(--amber);
      border-color: rgba(245, 158, 11, 0.3);
    }}
    .pill-accent {{
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border-color: rgba(56, 189, 248, 0.25);
    }}
    .pill-purple {{
      background: var(--purple-glow);
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.3);
    }}
    .dot-pulse {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--green);
      box-shadow: 0 0 10px var(--green);
      animation: pulse 2s infinite ease-in-out;
    }}
    @keyframes pulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.4; transform: scale(0.85); }}
    }}
    /* Hero CTA Box */
    .hero-cta-box {{
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
    }}
    .cta-text {{
      font-size: 1.05rem;
      color: var(--text-main);
      font-weight: 700;
    }}
    .cta-sub {{
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }}
    .cta-buttons {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }}
    .btn-cta {{
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
      padding: 0.75rem 1.4rem;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }}
    .btn-cta:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.55);
    }}
    .btn-secondary {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-subtle);
      color: var(--text-main);
      border: 1px solid var(--border-medium);
      padding: 0.75rem 1.2rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
    }}
    .btn-secondary:hover {{
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.08);
      transform: translateY(-2px);
    }}
    .footer {{
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      font-size: 0.82rem;
      color: var(--text-dim);
    }}
    code {{
      font-family: var(--font-mono);
      background: rgba(0, 0, 0, 0.35);
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      color: var(--accent);
    }}
    a.subtle-link {{
      color: var(--accent);
      text-decoration: none;
    }}
    a.subtle-link:hover {{
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header with Original Brand SVG Logo -->
    <div class="header">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 52px; height: 52px; filter: drop-shadow(0 0 14px rgba(56,189,248,0.4)); flex-shrink: 0;">
        <defs>
          <linearGradient id="shieldGradLanding" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
          <linearGradient id="pulseGradLanding" x1="7" y1="16" x2="25" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#7dd3fc"/>
            <stop offset="100%" stop-color="#60a5fa"/>
          </linearGradient>
        </defs>
        <path d="M16 3L5 7.2v8.5c0 7.2 4.7 11.8 11 13.3 6.3-1.5 11-6.1 11-13.3V7.2L16 3z" fill="#091122" stroke="url(#shieldGradLanding)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 16.2h3.2l2-3.8 3.6 7.4 2-3.6H23" stroke="url(#pulseGradLanding)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="16" cy="16" r="2" fill="#38bdf8"/>
      </svg>
      <div>
        <div class="brand-wrap">
          <h1 class="wordmark"><span class="wordmark-edge">Edge</span><span class="wordmark-shield">Shield</span></h1>
          <span class="badge-ver">Central Server v1.1</span>
        </div>
        <div class="tagline">Edge &rarr; Server &rarr; Lakehouse &rarr; Monitor</div>
      </div>
    </div>

    <p class="subtitle">
      Industrial-grade edge telemetry ingestion platform featuring durable SQLite spooling, dual-mode persistence, and high-throughput streaming into Databricks Medallion lakehouse tables.
    </p>

    <!-- Architecture Strip: Edge → Server → Lakehouse → Monitor -->
    <div class="pipeline-section">
      <div class="section-label">Pipeline Architecture</div>
      <div class="pipeline-strip">
        <div class="pipe-node">
          <div class="pipe-badge">1</div>
          <div class="pipe-content">
            <span class="pipe-title">Edge Nodes</span>
            <span class="pipe-sub">PC &amp; ESP32 Agents</span>
          </div>
        </div>
        <div class="pipe-arrow">&rarr;</div>
        <div class="pipe-node">
          <div class="pipe-badge pipe-active">2</div>
          <div class="pipe-content">
            <span class="pipe-title">Ingest Server</span>
            <span class="pipe-sub">Durable SQLite Spool</span>
          </div>
        </div>
        <div class="pipe-arrow">&rarr;</div>
        <div class="pipe-node">
          <div class="pipe-badge">3</div>
          <div class="pipe-content">
            <span class="pipe-title">Lakehouse</span>
            <span class="pipe-sub">Databricks Medallion</span>
          </div>
        </div>
        <div class="pipe-arrow">&rarr;</div>
        <div class="pipe-node">
          <div class="pipe-badge">4</div>
          <div class="pipe-content">
            <span class="pipe-title">Monitor</span>
            <span class="pipe-sub">Real-Time Observability</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Operational Status Pills -->
    <div class="status-section">
      <div class="section-label">Live Operational Status</div>
      <div class="pills">
        <div class="pill pill-green" title="Ingestion service is active and accepting metrics">
          <span class="dot-pulse"></span> Server: Online
        </div>
        <div class="pill pill-purple" title="Active persistence mode (local spool vs Databricks lakehouse)">
          Storage: <span id="pill-mode" style="font-weight: 700; text-transform: uppercase; margin-left: 3px;">{storage_mode}</span>
        </div>
        <div class="pill pill-amber" title="Records waiting in durable SQLite spool">
          Spool: <span id="pill-spool" style="font-weight: 700; margin-left: 3px;">{spool_pending}</span>&nbsp;pending
        </div>
        <div class="pill pill-accent" title="Active edge devices within last 120s vs total known">
          Devices: <span id="pill-devices" style="font-weight: 700; margin-left: 3px;">{devices_online} online / {devices_total} total</span>
        </div>
        <div class="pill pill-accent" title="Primary advertised endpoint for edge device ingestion">
          Ingest URL: <span id="pill-advertised" style="font-family: var(--font-mono); font-weight: 700; margin-left: 3px;">{advertised_url}</span>
        </div>
      </div>
    </div>

    <!-- Hero CTA Box with Actions -->
    <div class="hero-cta-box">
      <div>
        <div class="cta-text">EdgeShield Operations Console</div>
        <div class="cta-sub">Inspect edge fleet, manage spool flush, toggle storage mode &amp; view live health diagnostics</div>
      </div>
      <div class="cta-buttons">
        <a class="btn-cta" href="/console">
          <span>Open Ops Console</span>
          <span>&rarr;</span>
        </a>
        <a class="btn-secondary" href="/health" target="_blank">
          <span>Health JSON (/health)</span>
        </a>
        <a class="btn-secondary" href="/api/console/status" target="_blank">
          <span>Status API (/api/console/status)</span>
        </a>
      </div>
    </div>

    <div class="footer">
      <span>Primary Ingest Host: <code id="footer-adv">{advertised_host}</code> &bull; Bind Socket: <code>{listen_host}:{listen_port}</code></span>
      <span id="uptime-display">Uptime: {uptime_sec}s</span>
    </div>
  </div>

  <script>
    async function refreshStatus() {{
      try {{
        const res = await fetch('/api/console/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.spool) {{
          const el = document.getElementById('pill-spool');
          if (el) el.textContent = data.spool.pending;
        }}
        if (data.devices) {{
          const el = document.getElementById('pill-devices');
          if (el) el.textContent = `${{data.devices.online}} online / ${{data.devices.total}} total`;
        }}
        if (data.storage_mode) {{
          const el = document.getElementById('pill-mode');
          if (el) el.textContent = data.storage_mode.toUpperCase();
        }}
        if (data.advertised_url) {{
          const el = document.getElementById('pill-advertised');
          if (el) el.textContent = data.advertised_url;
        }}
        if (data.advertised_host) {{
          const foot = document.getElementById('footer-adv');
          if (foot) foot.textContent = data.advertised_host;
        }}
        if (data.uptime_seconds !== undefined) {{
          const el = document.getElementById('uptime-display');
          if (el) el.textContent = `Uptime: ${{Math.round(data.uptime_seconds)}}s`;
        }}
      }} catch (err) {{}}
    }}
    setInterval(refreshStatus, 4000);
  </script>
</body>
</html>"""


def render_console_html() -> str:
    """Renders the comprehensive 4-tab ops console: Overview | Devices | Spool | Logs."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeShield Server Console</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Cpath d='M16 3L5 7.2v8.5c0 7.2 4.7 11.8 11 13.3 6.3-1.5 11-6.1 11-13.3V7.2L16 3z' fill='%23091122' stroke='%2338bdf8' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M9 16.2h3.2l2-3.8 3.6 7.4 2-3.6H23' stroke='%2338bdf8' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%2338bdf8'/%3E%3C/svg%3E" />
  <style>
    :root {{
      --bg-page: #080c14;
      --bg-surface: #0f172a;
      --bg-card: #141e33;
      --bg-subtle: #19243c;
      --bg-input: #090e1a;
      --border-subtle: #1e293b;
      --border-medium: #2e3e5c;
      --border-focus: #38bdf8;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --green: #22c55e;
      --green-glow: rgba(34, 197, 94, 0.18);
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.18);
      --red: #ef4444;
      --red-glow: rgba(239, 68, 68, 0.18);
      --purple: #c084fc;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: var(--font-sans);
      background-color: var(--bg-page);
      color: var(--text-main);
      padding: 1.5rem;
      min-height: 100vh;
    }}
    /* Top Bar */
    .topbar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1240px;
      margin: 0 auto 1.5rem auto;
      padding: 0.85rem 1.25rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }}
    .brand-group {{
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }}
    .brand-badge {{
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
      font-weight: 800;
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      font-size: 0.95rem;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }}
    .brand-title {{
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
      color: var(--text-main);
    }}
    .topbar-right {{
      display: flex;
      align-items: center;
      gap: 1rem;
    }}
    .chip {{
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }}
    .chip-online {{
      background: var(--green-glow);
      color: var(--green);
      border-color: rgba(34, 197, 94, 0.3);
    }}
    .chip-mode {{
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.3);
    }}
    .chip-host {{
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      border-color: var(--border-subtle);
      font-family: var(--font-mono);
      text-transform: none;
    }}
    .dot-live {{
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: live-pulse 2s infinite ease-in-out;
    }}
    @keyframes live-pulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.4; transform: scale(0.85); }}
    }}
    .btn-nav {{
      color: var(--accent);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      transition: background 0.15s;
    }}
    .btn-nav:hover {{
      background: rgba(56, 189, 248, 0.1);
      text-decoration: underline;
    }}
    /* Main Layout */
    .container {{
      max-width: 1240px;
      margin: 0 auto;
    }}
    /* Toast System */
    #action-toast {{
      display: none;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      font-weight: 500;
      animation: toast-in 0.25s ease-out;
    }}
    @keyframes toast-in {{
      from {{ opacity: 0; transform: translateY(-6px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
    .toast-success {{
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }}
    .toast-error {{
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }}
    /* Tab Navigation */
    .tabs {{
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.5rem;
    }}
    .tab-btn {{
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.65rem 1.4rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      outline: none;
    }}
    .tab-btn:hover {{
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }}
    .tab-btn:focus-visible {{
      border-color: var(--border-focus);
    }}
    .tab-btn.active {{
      background: var(--bg-card);
      border-color: var(--border-medium);
      color: var(--accent);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }}
    .tab-content {{
      display: none;
    }}
    .tab-content.active {{
      display: block;
      animation: tab-fade 0.2s ease-out;
    }}
    @keyframes tab-fade {{
      from {{ opacity: 0; transform: translateY(4px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
    /* Card Grid */
    .grid-cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.15rem;
      margin-bottom: 1.5rem;
    }}
    .card {{
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 1.35rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }}
    .card-label {{
      font-size: 0.78rem;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.06em;
    }}
    .card-val {{
      font-size: 1.85rem;
      font-weight: 700;
      margin-top: 0.4rem;
      letter-spacing: -0.02em;
      color: var(--accent);
    }}
    .card-desc {{
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.4rem;
    }}
    /* Panels */
    .panel {{
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 1.6rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }}
    .panel-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }}
    .panel-title {{
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text-main);
    }}
    /* Storage Mode Segmented Controller */
    .mode-control-box {{
      margin-top: 1rem;
      padding: 1.25rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
    }}
    .mode-toggle-group {{
      display: inline-flex;
      background: var(--bg-input);
      border: 1px solid var(--border-medium);
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
    }}
    .mode-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.6rem 1.3rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.18s ease;
    }}
    .mode-btn:hover {{
      color: var(--text-main);
    }}
    .mode-btn.active {{
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 2px 10px rgba(2, 132, 199, 0.45);
    }}
    .mode-help-text {{
      margin-top: 0.85rem;
      font-size: 0.86rem;
      color: var(--text-muted);
      line-height: 1.5;
    }}
    /* Buttons */
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 0.65rem 1.35rem;
      border-radius: 8px;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }}
    .btn:hover:not(:disabled) {{
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.5);
      transform: translateY(-1px);
    }}
    .btn:disabled {{
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }}
    .btn-secondary {{
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      box-shadow: none;
      border: 1px solid var(--border-medium);
    }}
    .btn-secondary:hover:not(:disabled) {{
      background: rgba(255, 255, 255, 0.13);
      box-shadow: none;
      transform: none;
    }}
    /* Tables */
    .table-container {{
      overflow-x: auto;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }}
    th {{
      padding: 0.8rem 1rem;
      background: var(--bg-subtle);
      color: var(--text-dim);
      border-bottom: 1px solid var(--border-medium);
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }}
    td {{
      padding: 0.9rem 1rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.35);
    }}
    tr:last-child td {{ border-bottom: none; }}
    tr:hover td {{
      background: rgba(255, 255, 255, 0.02);
    }}
    .status-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }}
    .status-badge-online {{
      background: var(--green-glow);
      color: var(--green);
      border: 1px solid rgba(34, 197, 94, 0.4);
    }}
    .status-badge-offline {{
      background: rgba(148, 163, 184, 0.12);
      color: var(--text-muted);
      border: 1px solid rgba(148, 163, 184, 0.25);
    }}
    .badge-room {{
      background: rgba(56, 189, 248, 0.14);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.2rem 0.55rem;
      border-radius: 5px;
      font-size: 0.8rem;
      font-weight: 600;
    }}
    .badge-unassigned {{
      background: rgba(100, 116, 139, 0.15);
      color: var(--text-dim);
      border: 1px dashed rgba(100, 116, 139, 0.35);
      padding: 0.2rem 0.55rem;
      border-radius: 5px;
      font-size: 0.8rem;
      font-style: italic;
    }}
    /* Log viewer */
    .log-terminal {{
      background: #030611;
      border: 1px solid var(--border-medium);
      border-radius: 8px;
      padding: 1.15rem;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      line-height: 1.65;
      max-height: 520px;
      overflow-y: auto;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-all;
    }}
    .log-line {{
      padding: 2px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }}
    .lvl-INFO {{ color: #38bdf8; font-weight: 700; }}
    .lvl-WARNING {{ color: #fbbf24; font-weight: 700; }}
    .lvl-ERROR {{ color: #f87171; font-weight: 700; }}
    .empty-state {{
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-muted);
    }}
    .empty-state-title {{
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.4rem;
    }}
    .empty-state-sub {{
      font-size: 0.85rem;
      color: var(--text-dim);
    }}
  </style>
</head>
<body>
  <!-- Top Bar -->
  <div class="topbar">
    <div class="brand-group">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px; filter: drop-shadow(0 0 8px rgba(56,189,248,0.4)); flex-shrink: 0;">
        <path d="M16 3L5 7.2v8.5c0 7.2 4.7 11.8 11 13.3 6.3-1.5 11-6.1 11-13.3V7.2L16 3z" fill="#091122" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 16.2h3.2l2-3.8 3.6 7.4 2-3.6H23" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="16" cy="16" r="2" fill="#38bdf8"/>
      </svg>
      <span class="brand-title"><strong>Edge</strong><span style="color: var(--accent);">Shield</span> Console</span>
      <span class="chip chip-online"><span class="dot-live"></span> Online</span>
    </div>
    <div class="topbar-right">
      <span id="nav-mode-badge" class="chip chip-mode">MODE: LOCAL</span>
      <span class="chip chip-host"><code>{HOST}:{PORT}</code></span>
      <a class="btn-nav" href="/">&larr; Home</a>
    </div>
  </div>

  <div class="container">
    <div id="action-toast"></div>

    <!-- Tab navigation -->
    <div class="tabs" role="tablist">
      <button class="tab-btn active" role="tab" aria-selected="true" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTab('devices')">Devices</button>
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTab('spool')">Spool</button>
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTab('logs')">Logs</button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content active" role="tabpanel">
      <div class="grid-cards">
        <div class="card">
          <div class="card-label">Server Ingestion State</div>
          <div class="card-val" style="color: var(--green);" id="ov-status">Online</div>
          <div class="card-desc" id="ov-bind">Listening on {HOST}:{PORT}</div>
        </div>
        <div class="card">
          <div class="card-label">Process Uptime</div>
          <div class="card-val" id="ov-uptime">...</div>
          <div class="card-desc" id="ov-last-refreshed">Live process timer</div>
        </div>
        <div class="card">
          <div class="card-label">Storage Mode</div>
          <div class="card-val" style="color: var(--purple);" id="ov-storage-mode">...</div>
          <div class="card-desc" id="ov-mode-desc">Resolving persistence target</div>
        </div>
        <div class="card">
          <div class="card-label">Spool Queue Pending</div>
          <div class="card-val" style="color: var(--amber);" id="ov-spool">...</div>
          <div class="card-desc" id="ov-spool-sub">Durable records awaiting flush</div>
        </div>
        <div class="card">
          <div class="card-label">Active Edge Devices</div>
          <div class="card-val" id="ov-devices">...</div>
          <div class="card-desc">Online within last 120s</div>
        </div>
        <div class="card">
          <div class="card-label">Databricks Lakehouse</div>
          <div class="card-val" id="ov-db-configured" style="font-size: 1.35rem; margin-top: 0.65rem;">...</div>
          <div class="card-desc" id="ov-db-sub">Cloud warehouse connection</div>
        </div>
      </div>

      <!-- Storage Mode Controller -->
      <div class="panel">
        <div class="panel-title">Storage Mode Controller</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.35rem;">
          Control telemetry persistence behavior dynamically without restarting the server.
        </p>

        <div class="mode-control-box">
          <div class="mode-toggle-group">
            <button id="btn-mode-local" class="mode-btn" onclick="changeStorageMode('local')">Local (Spool Only)</button>
            <button id="btn-mode-databricks" class="mode-btn" onclick="changeStorageMode('databricks')">Databricks (Cloud Flush)</button>
          </div>
          <div class="mode-help-text" id="mode-help-text">
            <b>Local:</b> Telemetry records are safely appended to local SQLite spool without attempting cloud sync. Zero cloud failures.<br>
            <b>Databricks:</b> Background worker flushes batches into Databricks SQL Warehouse. Spool records are deleted only after all payload inserts succeed.
          </div>
        </div>
      </div>

      <!-- Last Flush Summary Card -->
      <div class="panel">
        <div class="panel-title">Last Spool Flush Summary</div>
        <div id="ov-flush-details" style="font-size: 0.9rem; line-height: 1.8; margin-top: 0.85rem; color: var(--text-muted);">
          Loading flush metadata...
        </div>
      </div>
    </div>

    <!-- TAB 2: DEVICES -->
    <div id="tab-devices" class="tab-content" role="tabpanel">
      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Registered Edge Fleet</div>
            <div style="font-size: 0.84rem; color: var(--text-dim); margin-top: 0.2rem;">Edge machines sending telemetry via /metrics</div>
          </div>
          <span class="chip chip-host" id="devices-count-label">0 devices</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Device ID</th>
                <th>Hostname</th>
                <th>Room</th>
                <th>Type</th>
                <th>Platform / OS</th>
                <th>Client IP</th>
                <th>Last Seen (UTC)</th>
              </tr>
            </thead>
            <tbody id="devices-tbody">
              <tr><td colspan="8" class="empty-state">Loading registry...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: SPOOL -->
    <div id="tab-spool" class="tab-content" role="tabpanel">
      <div class="grid-cards">
        <div class="card">
          <div class="card-label">Pending Spool Records</div>
          <div class="card-val" style="color: var(--amber);" id="spool-pending-val">...</div>
          <div class="card-desc" id="spool-cap-info">Max capacity: ...</div>
        </div>
        <div class="card">
          <div class="card-label">Flush Interval</div>
          <div class="card-val" id="spool-interval-val">...</div>
          <div class="card-desc">Seconds between automated background cycles</div>
        </div>
        <div class="card">
          <div class="card-label">Batch Size Limit</div>
          <div class="card-val" id="spool-batch-val">...</div>
          <div class="card-desc">Maximum payload records per flush batch</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Manual Spool Flush Trigger</div>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 0.25rem;">
              Manually trigger one flush cycle for the current storage mode. In Databricks mode, drains one batch to the cloud; in Local mode, runs a validated no-op.
            </p>
          </div>
          <button id="btn-flush-now" class="btn" onclick="triggerManualFlush()">
            <span>&uarr;</span> Flush Spool Now
          </button>
        </div>
        <div id="spool-flush-msg" style="margin-top: 0.85rem; font-size: 0.9rem;"></div>
      </div>

      <div class="panel">
        <div class="panel-title">Last Flush Outcome Detail</div>
        <div id="spool-last-flush" style="font-size: 0.9rem; line-height: 1.8; margin-top: 0.85rem; color: var(--text-muted);">
          Loading...
        </div>
      </div>
    </div>

    <!-- TAB 4: LOGS -->
    <div id="tab-logs" class="tab-content" role="tabpanel">
      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Server Operational Logs (Ring Buffer)</div>
            <div style="font-size: 0.84rem; color: var(--text-dim); margin-top: 0.2rem;">Live in-memory stream of recent operational server events</div>
          </div>
          <div style="display: flex; gap: 0.65rem; align-items: center;">
            <button class="btn btn-secondary" onclick="loadLogs(true)" style="padding: 0.45rem 0.9rem; font-size: 0.82rem;">Refresh</button>
            <label style="font-size: 0.82rem; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
              <input type="checkbox" id="chk-auto-logs" checked> Auto-refresh
            </label>
          </div>
        </div>
        <div class="log-terminal" id="log-terminal">
          <div style="color: var(--text-muted);">Connecting to log buffer...</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentTab = 'overview';
    let currentStorageMode = 'databricks';

    function switchTab(tab) {{
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => {{
        const isActive = b.textContent.toLowerCase() === tab;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }});
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const targetContent = document.getElementById('tab-' + tab);
      if (targetContent) targetContent.classList.add('active');

      if (tab === 'logs') loadLogs();
      if (tab === 'devices') loadDevices();
    }}

    function showToast(message, isError) {{
      const toast = document.getElementById('action-toast');
      toast.textContent = message;
      toast.className = isError ? 'toast-error' : 'toast-success';
      toast.style.display = 'block';
      setTimeout(() => {{ toast.style.display = 'none'; }}, 4500);
    }}

    function formatRelativeTime(isoStr) {{
      if (!isoStr) return '-';
      try {{
        const then = new Date(isoStr);
        const now = new Date();
        const diffSec = Math.floor((now - then) / 1000);
        if (diffSec < 5) return 'Just now';
        if (diffSec < 60) return `${{diffSec}}s ago`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${{diffMin}}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        return `${{diffHr}}h ago`;
      }} catch (e) {{
        return isoStr.replace('T', ' ').substring(0, 19);
      }}
    }}

    function formatUptime(seconds) {{
      if (!seconds && seconds !== 0) return '0s';
      const sec = Math.floor(seconds);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${{h}}h ${{m}}m ${{s}}s`;
      if (m > 0) return `${{m}}m ${{s}}s`;
      return `${{s}}s`;
    }}

    async function changeStorageMode(newMode) {{
      try {{
        document.getElementById('btn-mode-local').disabled = true;
        document.getElementById('btn-mode-databricks').disabled = true;

        const res = await fetch('/api/console/storage-mode', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ mode: newMode }})
        }});
        if (!res.ok) {{
          const err = await res.json();
          throw new Error(err.detail || 'Failed to switch storage mode');
        }}
        const data = await res.json();
        showToast(`Storage mode switched to ${{newMode.toUpperCase()}} successfully.`, false);
        await refreshStatus();
      }} catch (err) {{
        showToast(err.message, true);
      }} finally {{
        document.getElementById('btn-mode-local').disabled = false;
        document.getElementById('btn-mode-databricks').disabled = false;
      }}
    }}

    async function triggerManualFlush() {{
      const btn = document.getElementById('btn-flush-now');
      btn.disabled = true;
      btn.textContent = 'Flushing batch...';

      try {{
        const res = await fetch('/api/console/flush', {{ method: 'POST' }});
        const data = await res.json();
        if (res.ok) {{
          const isErr = data.status !== 'success';
          showToast(data.message || 'Flush completed.', isErr);
          const msgDiv = document.getElementById('spool-flush-msg');
          msgDiv.style.color = isErr ? 'var(--red)' : 'var(--green)';
          msgDiv.textContent = `Outcome: ${{data.message}} (Inserted: ${{data.inserted}}, Failed: ${{data.failed}}, Pending: ${{data.pending}})`;
        }} else {{
          throw new Error(data.detail || 'Flush request failed');
        }}
        await refreshStatus();
      }} catch (err) {{
        showToast('Flush failed: ' + err.message, true);
      }} finally {{
        btn.disabled = false;
        btn.innerHTML = '<span>&uarr;</span> Flush Spool Now';
      }}
    }}

    async function refreshStatus() {{
      try {{
        const res = await fetch('/api/console/status');
        if (!res.ok) return;
        const st = await res.json();

        // Mode
        currentStorageMode = st.storage_mode || 'databricks';
        document.getElementById('nav-mode-badge').textContent = 'MODE: ' + currentStorageMode.toUpperCase();
        document.getElementById('btn-mode-local').className = 'mode-btn' + (currentStorageMode === 'local' ? ' active' : '');
        document.getElementById('btn-mode-databricks').className = 'mode-btn' + (currentStorageMode === 'databricks' ? ' active' : '');
        document.getElementById('ov-storage-mode').textContent = currentStorageMode.toUpperCase();
        document.getElementById('ov-mode-desc').textContent = currentStorageMode === 'local' ? 'Retained in SQLite spool' : 'Batch sync to lakehouse';

        // Databricks configured
        const dbConf = document.getElementById('ov-db-configured');
        const dbSub = document.getElementById('ov-db-sub');
        if (st.databricks_configured) {{
          dbConf.textContent = 'Configured';
          dbConf.style.color = 'var(--green)';
          dbSub.textContent = 'Warehouse credentials active';
        }} else {{
          dbConf.textContent = 'Missing Config';
          dbConf.style.color = 'var(--amber)';
          dbSub.textContent = 'DATABRICKS_* env vars empty';
        }}

        // Overview stats
        document.getElementById('ov-devices').textContent = `${{st.devices?.online ?? 0}} / ${{st.devices?.total ?? 0}}`;
        document.getElementById('ov-spool').textContent = st.spool?.pending ?? 0;
        document.getElementById('ov-uptime').textContent = formatUptime(st.uptime_seconds);

        // Last flush info
        const lf = st.last_flush || {{}};
        const lfSuccess = lf.success;
        const lfStatusHtml = lfSuccess
          ? '<span style="color: var(--green); font-weight: 700;">OK / SUCCESS</span>'
          : '<span style="color: var(--amber); font-weight: 700;">RETRY / FAILED</span>';

        const lfHtml = `
          <div><b>Status:</b> ${{lfStatusHtml}}</div>
          <div><b>Timestamp:</b> ${{lf.timestamp ? lf.timestamp.replace('T', ' ').substring(0, 19) + ' UTC (' + formatRelativeTime(lf.timestamp) + ')' : 'No flush cycle yet'}}</div>
          <div><b>Batch Metrics:</b> ${{lf.inserted ?? 0}} inserted, ${{lf.failed ?? 0}} failed</div>
          ${{lf.message ? '<div><b>Message:</b> ' + lf.message + '</div>' : ''}}
          ${{lf.error ? '<div style="color: var(--red);"><b>Error:</b> ' + lf.error + '</div>' : ''}}
        `;
        document.getElementById('ov-flush-details').innerHTML = lfHtml;
        document.getElementById('spool-last-flush').innerHTML = lfHtml;

        // Spool tab stats
        document.getElementById('spool-pending-val').textContent = st.spool?.pending ?? 0;
        document.getElementById('spool-cap-info').textContent = `Max capacity: ${{st.spool?.max_records ?? 10000}} records`;
        document.getElementById('spool-interval-val').textContent = (st.spool?.flush_interval_seconds ?? 5) + 's';
        document.getElementById('spool-batch-val').textContent = st.spool?.flush_max_records ?? 20;

      }} catch (e) {{}}
    }}

    async function loadDevices() {{
      try {{
        const res = await fetch('/api/console/devices');
        if (!res.ok) return;
        const data = await res.json();
        const tbody = document.getElementById('devices-tbody');
        document.getElementById('devices-count-label').textContent = `${{data.online}} online / ${{data.total}} total`;

        if (!data.devices || data.devices.length === 0) {{
          tbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="empty-state">
                  <div class="empty-state-title">No Edge Devices Connected</div>
                  <div class="empty-state-sub">Start an EdgeShield PC client or post JSON telemetry to <code>/metrics</code> to populate the registry.</div>
                </div>
              </td>
            </tr>
          `;
          return;
        }}

        tbody.innerHTML = data.devices.map(d => `
          <tr>
            <td>
              <span class="status-badge ${{d.is_online ? 'status-badge-online' : 'status-badge-offline'}}">
                ${{d.is_online ? '<span class="dot-live"></span> ONLINE' : '&bull; IDLE'}}
              </span>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-main);">${{d.device_id || '-'}}</td>
            <td>${{d.hostname || '-'}}</td>
            <td>${{d.room ? '<span class="badge-room">' + d.room + '</span>' : '<span class="badge-unassigned">Unassigned</span>'}}</td>
            <td><code style="font-size: 0.8rem;">${{d.type || 'pc_telemetry'}}</code></td>
            <td>${{d.platform || '-'}}</td>
            <td style="font-family: var(--font-mono); color: var(--text-muted);">${{d.client_ip || '-'}}</td>
            <td style="color: var(--text-muted); font-size: 0.84rem;" title="${{d.last_seen_utc || ''}}">
              ${{formatRelativeTime(d.last_seen_utc)}}
            </td>
          </tr>
        `).join('');
      }} catch (e) {{}}
    }}

    async function loadLogs(force) {{
      if (!force && !document.getElementById('chk-auto-logs').checked && currentTab !== 'logs') return;
      try {{
        const res = await fetch('/api/console/logs?limit=200');
        if (!res.ok) return;
        const data = await res.json();
        const terminal = document.getElementById('log-terminal');

        if (!data.logs || data.logs.length === 0) {{
          terminal.innerHTML = '<div class="empty-state"><div class="empty-state-title">No Logs Recorded</div><div class="empty-state-sub">Operational server logs will stream here automatically.</div></div>';
          return;
        }}

        terminal.innerHTML = data.logs.map(l => {{
          const lvlClass = 'lvl-' + (l.level || 'INFO');
          const timeShort = l.timestamp ? l.timestamp.substring(11, 19) : '';
          return `<div class="log-line"><span style="color: var(--text-dim); margin-right: 6px;">[${{timeShort}}]</span><span class="${{lvlClass}}" style="margin-right: 6px;">[${{l.level}}]</span><span style="color: #64748b; margin-right: 8px;">[${{l.logger}}]</span>${{l.message}}</div>`;
        }}).join('');

        // Auto-scroll to bottom of log stream
        terminal.scrollTop = terminal.scrollHeight;
      }} catch (e) {{}}
    }}

    // Initial load
    refreshStatus();
    loadDevices();
    loadLogs(true);

    // Periodic poll
    setInterval(() => {{
      refreshStatus();
      if (currentTab === 'devices') loadDevices();
      if (document.getElementById('chk-auto-logs').checked && currentTab === 'logs') loadLogs();
    }}, 3000);
  </script>
</body>
</html>"""
