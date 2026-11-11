# EdgeShield Documentation & Presentation Workspace

> **Engineering report and interactive presentation workspace.**  
> For the complete system architecture, data pipeline, and hardware clients, see the [Root README](../README.md).

This folder contains project documentation, engineering specifications, and the interactive presentation application for the EdgeShield platform.

---

## Directory Contents

* **[`EdgeShield_Project_Report.pdf`](EdgeShield_Project_Report.pdf)**: Comprehensive engineering report detailing edge telemetry design, hardware integration, Databricks medallion lakehouse architecture, and performance benchmarks.
* **[`presentation/`](presentation/)**: Interactive 7-slide presentation website built with Vite, React, TypeScript, and Tailwind CSS.

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

Open your browser to [http://localhost:5173](http://localhost:5173) (or the port indicated in terminal output).

---

## Interactive Workflow Assets

Slide 4 ("Complete Workflow") embeds a live interactive architecture and telemetry pipeline simulation located in [`presentation/public/workflow/`](presentation/public/workflow/).

For keyboard shortcuts, slide breakdown, and build instructions, see the [`presentation/README.md`](presentation/README.md).
