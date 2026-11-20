from typing import Dict, Any
from config import HOST, PORT, STORAGE_MODE


def render_landing_html(status_data: Dict[str, Any]) -> str:
    """Renders the HTML landing page for EdgeShield Central Server."""
    spool_pending = status_data.get("spool", {}).get("pending", 0)
    devices = status_data.get("devices", {})
    devices_online = devices.get("online", 0)
    devices_total = devices.get("total", 0)
    storage_mode = status_data.get("storage_mode", STORAGE_MODE)
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
      max-width: 700px;
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
      padding: 0.9rem;
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
      <div class="pill pill-amber" title="Records waiting in durable spool for cloud flush">
        <span class="dot"></span> Spool: <span id="pill-spool">{spool_pending}</span> pending
      </div>
      <div class="pill pill-accent" title="Edge devices active in last 120s vs total known">
        <span class="dot"></span> Devices: <span id="pill-devices">{devices_online} online / {devices_total} total</span>
      </div>
      <div class="pill pill-accent" title="Configured destination">
        Storage: {storage_mode.upper()}
      </div>
    </div>

    <div class="section-title">Console & APIs</div>
    <div class="links-grid">
      <a class="link-card" href="/console">
        <span class="link-title">Ops Console &rarr;</span>
        <span class="link-desc">View registered devices & ingestion stream</span>
      </a>
      <a class="link-card" href="/api/console/status" target="_blank">
        <span class="link-title">GET /api/console/status</span>
        <span class="link-desc">Real-time status, spool & health JSON</span>
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
    // Live update status pills every 5 seconds
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
        if (data.uptime_seconds !== undefined) {{
          document.getElementById('uptime-display').textContent = `Uptime: ${{data.uptime_seconds}}s`;
        }}
      }} catch (err) {{}}
    }}
    setInterval(refreshStatus, 5000);
  </script>
</body>
</html>"""


def render_console_html() -> str:
    """Renders the placeholder ops console page displaying live registered devices."""
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
      --green: #22c55e;
      --amber: #f59e0b;
      --red: #ef4444;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 2rem;
    }}
    .navbar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1100px;
      margin: 0 auto 2rem auto;
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
      font-weight: bold;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }}
    .container {{
      max-width: 1100px;
      margin: 0 auto;
    }}
    .stats-bar {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }}
    .stat-card {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
    }}
    .stat-label {{
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }}
    .stat-val {{
      font-size: 1.6rem;
      font-weight: 700;
      margin-top: 0.35rem;
      color: var(--accent);
    }}
    .panel {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      overflow-x: auto;
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
    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }}
    th {{
      padding: 0.75rem 1rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
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
    .empty-msg {{
      text-align: center;
      padding: 2.5rem;
      color: var(--text-muted);
      font-size: 0.95rem;
    }}
    .placeholder-badge {{
      display: inline-block;
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <div class="navbar">
    <div class="logo-group">
      <span class="badge">ES CONSOLE</span>
      <span style="font-weight: 700; font-size: 1.1rem;">EdgeShield Ingestion Ops</span>
      <span class="placeholder-badge">Console Foundation v1.1</span>
    </div>
    <a href="/">&larr; Back to Landing Page</a>
  </div>

  <div class="container">
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Server Status</div>
        <div class="stat-val" style="color: var(--green);" id="server-status">Online</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Spool Pending</div>
        <div class="stat-val" id="spool-val">...</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Edge Devices</div>
        <div class="stat-val" id="devices-val">...</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Registered Edge Devices</div>
        <span style="font-size: 0.8rem; color: var(--text-muted);" id="last-update">Updating...</span>
      </div>
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
          <tr>
            <td colspan="8" class="empty-msg">Loading device registry...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function loadConsole() {{
      try {{
        const [statusRes, devRes] = await Promise.all([
          fetch('/api/console/status'),
          fetch('/api/console/devices')
        ]);
        if (statusRes.ok) {{
          const st = await statusRes.json();
          document.getElementById('spool-val').textContent = st.spool?.pending ?? 0;
          if (st.devices) {{
            document.getElementById('devices-val').textContent = `${{st.devices.online}} / ${{st.devices.total}}`;
          }}
        }}
        if (devRes.ok) {{
          const data = await devRes.json();
          const tbody = document.getElementById('devices-tbody');
          if (!data.devices || data.devices.length === 0) {{
            tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">No devices registered yet. Start an EdgeShield client or post telemetry to <code>/metrics</code>.</td></tr>';
          }} else {{
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
          }}
          document.getElementById('last-update').textContent = 'Last refreshed: ' + new Date().toLocaleTimeString();
        }}
      }} catch (e) {{}}
    }}

    loadConsole();
    setInterval(loadConsole, 4000);
  </script>
</body>
</html>"""
