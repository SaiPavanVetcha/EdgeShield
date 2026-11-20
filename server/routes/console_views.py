from typing import Any, Dict
from config import HOST, PORT
from runtime_config import get_storage_mode


def render_landing_html(status_data: Dict[str, Any]) -> str:
    """Renders the HTML landing page for EdgeShield Central Server."""
    spool_pending = status_data.get("spool", {}).get("pending", 0)
    devices = status_data.get("devices", {})
    devices_online = devices.get("online", 0)
    devices_total = devices.get("total", 0)
    storage_mode = status_data.get("storage_mode", get_storage_mode())
    uptime_sec = status_data.get("uptime_seconds", 0)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeShield Central Server</title>
  <style>
    :root {{
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --green: #22c55e;
      --green-glow: rgba(34, 197, 94, 0.2);
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.2);
      --purple: #a855f7;
      --purple-glow: rgba(168, 85, 247, 0.2);
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }}
    .container {{
      max-width: 720px;
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 2.25rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.45);
    }}
    .header {{
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }}
    .logo-badge {{
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.25rem;
      color: white;
      box-shadow: 0 4px 12px rgba(37,99,235,0.4);
    }}
    h1 {{
      font-size: 1.7rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .subtitle {{
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }}
    .pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }}
    .pill {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.95rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid transparent;
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
      background: var(--accent-glow);
      color: var(--accent);
      border-color: rgba(56, 189, 248, 0.3);
    }}
    .pill-purple {{
      background: var(--purple-glow);
      color: var(--purple);
      border-color: rgba(168, 85, 247, 0.3);
    }}
    .dot {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: currentColor;
      box-shadow: 0 0 8px currentColor;
    }}
    .section-title {{
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.85rem;
    }}
    .links-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.85rem;
    }}
    .link-card {{
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 0.95rem;
      text-decoration: none;
      color: var(--text-main);
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }}
    .link-card:hover {{
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.06);
      transform: translateY(-2px);
    }}
    .link-title {{
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--accent);
    }}
    .link-desc {{
      font-size: 0.78rem;
      color: var(--text-muted);
    }}
    .footer {{
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-muted);
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">ES</div>
      <h1>EdgeShield Central Server</h1>
    </div>
    <p class="subtitle">
      Real-time edge telemetry ingestion & operational monitoring console.
    </p>

    <div class="section-title">Operational Status</div>
    <div class="pills">
      <div class="pill pill-green" title="Ingestion service is active and accepting metrics">
        <span class="dot"></span> Server: Online
      </div>
      <div class="pill pill-amber" title="Records waiting in durable spool">
        <span class="dot"></span> Spool: <span id="pill-spool">{spool_pending}</span> pending
      </div>
      <div class="pill pill-accent" title="Active edge devices within last 120s vs total">
        <span class="dot"></span> Devices: <span id="pill-devices">{devices_online} online / {devices_total} total</span>
      </div>
      <div class="pill pill-purple" title="Active storage mode (local spool vs Databricks cloud)">
        Mode: <span id="pill-mode" style="text-transform: uppercase;">{storage_mode}</span>
      </div>
    </div>

    <div class="section-title">Console & APIs</div>
    <div class="links-grid">
      <a class="link-card" href="/console">
        <span class="link-title">Ops Console &rarr;</span>
        <span class="link-desc">Tabs: Overview, Devices, Spool & Live Logs</span>
      </a>
      <a class="link-card" href="/api/console/status" target="_blank">
        <span class="link-title">GET /api/console/status</span>
        <span class="link-desc">Storage mode, spool status & health JSON</span>
      </a>
      <a class="link-card" href="/api/console/devices" target="_blank">
        <span class="link-title">GET /api/console/devices</span>
        <span class="link-desc">Active device registry & telemetry metadata</span>
      </a>
      <a class="link-card" href="/health" target="_blank">
        <span class="link-title">GET /health</span>
        <span class="link-desc">Standard service health & spool metrics</span>
      </a>
    </div>

    <div class="footer">
      <span>Bind: <code>{HOST}:{PORT}</code></span>
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
          document.getElementById('pill-spool').textContent = data.spool.pending;
        }}
        if (data.devices) {{
          document.getElementById('pill-devices').textContent = `${{data.devices.online}} online / ${{data.devices.total}} total`;
        }}
        if (data.storage_mode) {{
          document.getElementById('pill-mode').textContent = data.storage_mode.toUpperCase();
        }}
        if (data.uptime_seconds !== undefined) {{
          document.getElementById('uptime-display').textContent = `Uptime: ${{data.uptime_seconds}}s`;
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
  <style>
    :root {{
      --bg: #0b1120;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --green: #22c55e;
      --amber: #f59e0b;
      --red: #ef4444;
      --purple: #c084fc;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 1.5rem;
    }}
    .navbar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto 1.5rem auto;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--card-border);
    }}
    .navbar a {{
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }}
    .navbar a:hover {{ text-decoration: underline; }}
    .logo-group {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}
    .badge {{
      background: #0284c7;
      color: white;
      font-weight: 700;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }}
    .container {{
      max-width: 1200px;
      margin: 0 auto;
    }}
    .tabs {{
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.5rem;
    }}
    .tab-btn {{
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .tab-btn:hover {{
      color: var(--text-main);
      background: rgba(255,255,255,0.05);
    }}
    .tab-btn.active {{
      background: var(--card-bg);
      border-color: var(--card-border);
      color: var(--accent);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }}
    .tab-content {{
      display: none;
    }}
    .tab-content.active {{
      display: block;
    }}
    .grid-cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }}
    .card {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
    }}
    .card-label {{
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }}
    .card-val {{
      font-size: 1.7rem;
      font-weight: 700;
      margin-top: 0.35rem;
      color: var(--accent);
    }}
    .panel {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }}
    .panel-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }}
    .panel-title {{
      font-size: 1.15rem;
      font-weight: 600;
    }}
    /* Mode toggle button group */
    .mode-toggle-group {{
      display: inline-flex;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
      margin-top: 0.75rem;
    }}
    .mode-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      font-size: 0.88rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .mode-btn.active {{
      background: #0284c7;
      color: white;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }}
    /* Buttons */
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }}
    .btn:hover {{ background: #0369a1; }}
    .btn:disabled {{ opacity: 0.5; cursor: not-allowed; }}
    .btn-secondary {{
      background: rgba(255,255,255,0.1);
      color: var(--text-main);
    }}
    .btn-secondary:hover {{ background: rgba(255,255,255,0.15); }}
    /* Tables */
    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }}
    th {{
      padding: 0.75rem 1rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    td {{
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(51, 65, 85, 0.4);
    }}
    tr:last-child td {{ border-bottom: none; }}
    .status-pill {{
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }}
    .status-online {{
      background: rgba(34, 197, 94, 0.2);
      color: var(--green);
      border: 1px solid rgba(34, 197, 94, 0.4);
    }}
    .status-offline {{
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-muted);
      border: 1px solid rgba(148, 163, 184, 0.3);
    }}
    /* Log viewer */
    .log-terminal {{
      background: #030712;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      line-height: 1.6;
      max-height: 480px;
      overflow-y: auto;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-all;
    }}
    .log-line {{
      padding: 2px 0;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }}
    .lvl-INFO {{ color: #38bdf8; font-weight: 600; }}
    .lvl-WARNING {{ color: #fbbf24; font-weight: 600; }}
    .lvl-ERROR {{ color: #f87171; font-weight: 600; }}
    /* Notifications toast */
    #action-toast {{
      display: none;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      font-weight: 500;
    }}
    .toast-success {{
      background: rgba(34, 197, 94, 0.15);
      color: var(--green);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }}
    .toast-error {{
      background: rgba(239, 68, 68, 0.15);
      color: var(--red);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }}
  </style>
</head>
<body>
  <div class="navbar">
    <div class="logo-group">
      <span class="badge">ES CONSOLE</span>
      <span style="font-weight: 700; font-size: 1.1rem;">EdgeShield Ingestion Ops</span>
    </div>
    <div style="display: flex; gap: 1rem; align-items: center;">
      <span id="nav-mode-badge" style="background: rgba(168,85,247,0.2); color: #c084fc; border: 1px solid rgba(168,85,247,0.4); padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">MODE: LOCAL</span>
      <a href="/">&larr; Landing Page</a>
    </div>
  </div>

  <div class="container">
    <div id="action-toast"></div>

    <!-- Tab navigation -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" onclick="switchTab('devices')">Devices</button>
      <button class="tab-btn" onclick="switchTab('spool')">Spool</button>
      <button class="tab-btn" onclick="switchTab('logs')">Logs</button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content active">
      <div class="grid-cards">
        <div class="card">
          <div class="card-label">Server State</div>
          <div class="card-val" style="color: var(--green);" id="ov-status">Online</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;" id="ov-bind">Bind: {HOST}:{PORT}</div>
        </div>
        <div class="card">
          <div class="card-label">Active Edge Devices</div>
          <div class="card-val" id="ov-devices">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">Seen within 120s</div>
        </div>
        <div class="card">
          <div class="card-label">Spool Queue</div>
          <div class="card-val" style="color: var(--amber);" id="ov-spool">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;" id="ov-spool-sub">Records on local disk</div>
        </div>
        <div class="card">
          <div class="card-label">Process Uptime</div>
          <div class="card-val" id="ov-uptime">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;" id="ov-last-refreshed">Active</div>
        </div>
      </div>

      <!-- Storage Mode Controller -->
      <div class="panel">
        <div class="panel-title">Storage Mode Controller</div>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 0.35rem; margin-bottom: 0.85rem;">
          Select how ingested telemetry is persisted. In <b>local</b> mode, records are durably retained in the local SQLite spool without attempting cloud sync. In <b>databricks</b> mode, the background worker transactionally commits spool batches to the lakehouse.
        </p>
        <div class="mode-toggle-group">
          <button id="btn-mode-local" class="mode-btn" onclick="changeStorageMode('local')">Local (Spool Only)</button>
          <button id="btn-mode-databricks" class="mode-btn" onclick="changeStorageMode('databricks')">Databricks (Cloud Flush)</button>
        </div>
        <div style="margin-top: 0.85rem; font-size: 0.85rem;">
          <span>Databricks Configuration: </span>
          <span id="ov-db-configured" style="font-weight: 600;">Checking...</span>
        </div>
      </div>

      <!-- Last Flush Summary Card -->
      <div class="panel">
        <div class="panel-title">Last Spool Flush Summary</div>
        <div id="ov-flush-details" style="font-size: 0.88rem; line-height: 1.8; margin-top: 0.75rem; color: var(--text-muted);">
          Loading flush metadata...
        </div>
      </div>
    </div>

    <!-- TAB 2: DEVICES -->
    <div id="tab-devices" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Registered Edge Devices</div>
          <span style="font-size: 0.8rem; color: var(--text-muted);" id="devices-count-label">0 devices</span>
        </div>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Device ID</th>
                <th>Hostname</th>
                <th>Room</th>
                <th>Type</th>
                <th>Platform</th>
                <th>Client IP</th>
                <th>Last Seen (UTC)</th>
              </tr>
            </thead>
            <tbody id="devices-tbody">
              <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading registry...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: SPOOL -->
    <div id="tab-spool" class="tab-content">
      <div class="grid-cards">
        <div class="card">
          <div class="card-label">Pending Records</div>
          <div class="card-val" style="color: var(--amber);" id="spool-pending-val">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;" id="spool-cap-info">Max capacity: ...</div>
        </div>
        <div class="card">
          <div class="card-label">Flush Interval</div>
          <div class="card-val" id="spool-interval-val">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">Seconds between cycles</div>
        </div>
        <div class="card">
          <div class="card-label">Batch Size Limit</div>
          <div class="card-val" id="spool-batch-val">...</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">Max records per transaction</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Manual Spool Flush Trigger</div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
              Trigger an immediate flush cycle. If storage mode is Databricks, flushes pending batch atomically; if local, performs a validated no-op.
            </p>
          </div>
          <button id="btn-flush-now" class="btn" onclick="triggerManualFlush()">
            <span>&uarr;</span> Flush Spool Now
          </button>
        </div>
        <div id="spool-flush-msg" style="margin-top: 0.75rem; font-size: 0.88rem; color: var(--text-muted);"></div>
      </div>

      <div class="panel">
        <div class="panel-title">Last Flush Transaction Detail</div>
        <div id="spool-last-flush" style="font-size: 0.88rem; line-height: 1.8; margin-top: 0.75rem; color: var(--text-muted);">
          Loading...
        </div>
      </div>
    </div>

    <!-- TAB 4: LOGS -->
    <div id="tab-logs" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Server Operational Logs (Ring Buffer)</div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-secondary" onclick="loadLogs(true)" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Refresh</button>
            <label style="font-size: 0.8rem; color: var(--text-muted); cursor: pointer;">
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
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase() === tab);
      if (targetBtn) targetBtn.classList.add('active');

      const targetContent = document.getElementById('tab-' + tab);
      if (targetContent) targetContent.classList.add('active');

      if (tab === 'logs') loadLogs();
    }}

    function showToast(message, isError) {{
      const toast = document.getElementById('action-toast');
      toast.textContent = message;
      toast.className = isError ? 'toast-error' : 'toast-success';
      toast.style.display = 'block';
      setTimeout(() => {{ toast.style.display = 'none'; }}, 5000);
    }}

    async function changeStorageMode(newMode) {{
      try {{
        const btn = document.getElementById('btn-mode-' + newMode);
        if (btn) btn.disabled = true;

        const res = await fetch('/api/console/storage-mode', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ mode: newMode }})
        }});
        if (!res.ok) {{
          const err = await res.json();
          throw new Error(err.detail || 'Failed to change mode');
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
      btn.textContent = 'Flushing...';

      try {{
        const res = await fetch('/api/console/flush', {{ method: 'POST' }});
        const data = await res.json();
        if (res.ok) {{
          showToast(data.message || 'Flush cycle completed.', data.status !== 'success');
          document.getElementById('spool-flush-msg').textContent = `Outcome: ${{data.message}} (Inserted: ${{data.inserted}}, Failed: ${{data.failed}}, Pending: ${{data.pending}})`;
        }} else {{
          throw new Error(data.detail || 'Flush failed');
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

        // Databricks configured
        const dbConf = document.getElementById('ov-db-configured');
        if (st.databricks_configured) {{
          dbConf.textContent = 'Configured (Host, Path, Token available)';
          dbConf.style.color = 'var(--green)';
        }} else {{
          dbConf.textContent = 'Not Configured (Missing env credentials)';
          dbConf.style.color = 'var(--amber)';
        }}

        // Overview stats
        document.getElementById('ov-devices').textContent = `${{st.devices?.online ?? 0}} / ${{st.devices?.total ?? 0}}`;
        document.getElementById('ov-spool').textContent = st.spool?.pending ?? 0;
        document.getElementById('ov-uptime').textContent = (st.uptime_seconds ?? 0) + 's';

        // Last flush info
        const lf = st.last_flush || {{}};
        const lfHtml = `
          <div><b>Status:</b> <span style="color: ${{lf.success ? 'var(--green)' : 'var(--amber)'}}">${{lf.success ? 'SUCCESS / OK' : 'FAILED / RETRY'}}</span></div>
          <div><b>Timestamp:</b> ${{lf.timestamp ? lf.timestamp.replace('T', ' ').substring(0, 19) + ' UTC' : 'None yet'}}</div>
          <div><b>Last Batch:</b> ${{lf.inserted ?? 0}} inserted, ${{lf.failed ?? 0}} failed</div>
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
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No devices registered yet. Start an EdgeShield client or post telemetry to <code>/metrics</code>.</td></tr>';
          return;
        }}

        tbody.innerHTML = data.devices.map(d => `
          <tr>
            <td>
              <span class="status-pill ${{d.is_online ? 'status-online' : 'status-offline'}}">
                ${{d.is_online ? 'ONLINE' : 'IDLE'}}
              </span>
            </td>
            <td style="font-family: monospace; font-weight: 600;">${{d.device_id || '-'}}</td>
            <td>${{d.hostname || '-'}}</td>
            <td>${{d.room ? '<span style="background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">' + d.room + '</span>' : '-'}}</td>
            <td>${{d.type || '-'}}</td>
            <td>${{d.platform || '-'}}</td>
            <td style="font-family: monospace;">${{d.client_ip || '-'}}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${{d.last_seen_utc ? d.last_seen_utc.replace('T', ' ').substring(0, 19) : '-'}}</td>
          </tr>
        `).join('');
      }} catch (e) {{}}
    }}

    async function loadLogs(force) {{
      if (!force && !document.getElementById('chk-auto-logs').checked && currentTab !== 'logs') return;
      try {{
        const res = await fetch('/api/console/logs?limit=150');
        if (!res.ok) return;
        const data = await res.json();
        const terminal = document.getElementById('log-terminal');

        if (!data.logs || data.logs.length === 0) {{
          terminal.innerHTML = '<div style="color: var(--text-muted);">No logs captured in buffer yet.</div>';
          return;
        }}

        terminal.innerHTML = data.logs.map(l => {{
          const lvlClass = 'lvl-' + (l.level || 'INFO');
          return `<div class="log-line"><span style="color: var(--text-muted);">[${{l.timestamp ? l.timestamp.substring(11, 19) : ''}}]</span> <span class="${{lvlClass}}">[${{l.level}}]</span> <span style="color: #64748b;">[${{l.logger}}]</span> ${{l.message}}</div>`;
        }}).join('');

        // Scroll to bottom
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
    }}, 3500);
  </script>
</body>
</html>"""
