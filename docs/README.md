# EdgeShield Documentation & Presentation Workspace

> **Engineering report, pilot specifications, and interactive presentation workspace.**  
> For the complete system architecture, data pipeline, and hardware clients, see the [Root README](../README.md).

This folder contains project documentation, engineering specifications, and the interactive presentation application for the EdgeShield platform.

---

## Directory Contents

* **[`EdgeShield_Project_Report.pdf`](EdgeShield_Project_Report.pdf)**: Comprehensive engineering report detailing edge telemetry design, hardware integration, Databricks medallion lakehouse architecture, and performance benchmarks.
* **[`presentation/`](presentation/)**: Interactive 7-slide presentation website built with Vite, React, TypeScript, and Tailwind CSS.
* **[`../docs/PILOT_AND_LIMITATIONS.md`](../docs/PILOT_AND_LIMITATIONS.md)**: External reviewer evaluation brief covering v1.1 production hardening, operational boundaries, pilot runbooks, and schema migration notes.

---

## Presentation Slide Updates (v1.1 Alignment)

> [!NOTE]
> **Slide Deck v1.1 Alignment:**  
> The presentation application in [`presentation/`](presentation/) should be maintained in sync with the v1.1 hardening milestone. When updating slides, ensure the following topics are incorporated:
> - Dual storage modes (`local` vs. `databricks`) and the embedded Server Console ops UI.
> - Two-stage durable SQLite spooling (client offline queue + server durable buffer).
> - Physical location tracking (`room` dimension in `dim_device` and dashboard room filter).
> - Adaptive battery capability gating (suppressing battery metrics for stationary desktops).
> - Safe parameterized SQL execution against Databricks Gold tables.
>
> See [`presentation/README.md`](presentation/README.md) for the detailed slide-by-slide checklist.

---

## Quickstart: Running the Presentation

The presentation is a standalone client-side React application with zero backend or database dependencies:

```bash
# Navigate to presentation directory
cd presentation

# Install dependencies (Node.js 18+)
npm install

# Start local presentation server
npm run dev
```

Open your browser to [http://localhost:5173](http://localhost:5173).

---

## Interactive Workflow Assets

Slide 4 ("Complete Workflow") embeds a live interactive architecture and telemetry pipeline simulation located in [`presentation/public/workflow/`](presentation/public/workflow/).
