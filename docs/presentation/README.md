# EdgeShield Presentation Website

> **Interactive 7-slide presentation application showcasing EdgeShield.**  
> For the documentation directory, see the [Doc README](../README.md). For overall system architecture, see the [Root README](../../README.md).

This folder contains a modular, responsive presentation website for presenting the EdgeShield edge-to-lakehouse platform to stakeholders, grant reviewers, and technical audiences. It is built with **React, TypeScript, Vite, and Tailwind CSS**.

---

## v1.1 Slide Alignment & Maintenance Note

> [!IMPORTANT]
> **Slide Deck v1.1 Alignment Requirement:**  
> The presentation reflects the core architecture of EdgeShield. As the platform advances through the `v1.1-hardening` milestone, future visual updates to the presentation slides should incorporate the following newly verified production capabilities:
>
> 1. **Slide 1 (Hero / Architecture):** Highlight dual storage modes (`local` pilot vs. `databricks` cloud) and the embedded Server Console ops plane (`/console`).
> 2. **Slide 3 (Solution Overview):** Illustrate the two-stage durable SQLite spooling architecture (client offline queue + server durable buffer) ensuring zero telemetry loss during network disconnections.
> 3. **Slide 4 (Interactive Workflow):** Update the telemetry flow diagram to show local spooling before cloud batch writes, and acknowledge the runtime storage mode switcher.
> 4. **Slide 5 (Gold Layer Star Schema):** Detail the new `room` dimension in `dim_device` and explain adaptive battery capability gating (suppressing battery KPIs/charts for stationary desktops).
> 5. **Slide 6 (Product Roadmap):** Mark the v1.1 Hardening milestone as **Fully Operational** (durable spooling, transactional ingest, server console, parameterized SQL, room dimension, and battery gating), positioning v2 for mTLS/token auth, Delta-persisted alert state, and ML anomaly detection.

---

## Development & Usage

1. **Install dependencies (Node.js 18+):**
   ```bash
   npm install
   ```

2. **Start the local presentation server:**
   ```bash
   npm run dev
   ```
   Open your browser to the local server URL (e.g., [http://localhost:5173](http://localhost:5173)).

3. **Build for static hosting:**
   ```bash
   npm run build
   ```
   Outputs production assets to `dist/`.

4. **Linting:**
   ```bash
   npm run lint
   ```

---

## Configuration

This application runs entirely client-side. No API keys, database credentials, or environment variables are required.

---

## Presentation Keyboard Controls

| Key | Action |
| :--- | :--- |
| **`→`** / **`Space`** / **`PageDown`** | Advance to Next Slide |
| **`←`** / **`Backspace`** / **`PageUp`** | Return to Previous Slide |
| **`1`** – **`7`** | Jump directly to Slide 1 through 7 |
| **`F`** | Toggle Fullscreen Mode |
| **`?`** | Open / Close Keyboard Shortcuts Guide |
| **`Esc`** | Close Lightbox or Modal |

---

## Slide Outline

1. **Title / Hero:** EdgeShield overview (*Edge Devices → Lakehouse → Intelligent Monitoring*).
2. **The Problem:** Edge observability bottlenecks, resource constraints, and fragmented telemetry.
3. **Solution Overview:** Dual edge collection, asynchronous ingestion, Medallion lakehouse architecture, and real-time dashboard.
4. **Complete Workflow:** Live embedded interactive architecture workflow demo (`public/workflow/index.html`).
5. **Gold Layer & Why It Matters:** Star schema design (`dim_device` + 5 `fact_*` tables), independent sampling timestamps, and analytical queries.
6. **Version Roadmap:** V1.1 Hardened Observability (durable spool, server console, room dimension, safe SQL), V2 (ML anomaly detection), V3 (Natural Language Queries).
7. **Summary & Closing:** EdgeShield summary and architectural takeaways.

---

## Interactive Workflow Demo

Slide 4 dynamically embeds the interactive simulation in [`public/workflow/index.html`](public/workflow/index.html) within a responsive iframe, demonstrating live event propagation from edge devices through the ingestion tier and Databricks lakehouse layers into the dashboard.
