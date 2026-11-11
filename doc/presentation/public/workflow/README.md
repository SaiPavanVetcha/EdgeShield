# EdgeShield Interactive Workflow Assets

> **Interactive telemetry pipeline simulation embedded in the EdgeShield presentation.**  
> For the presentation website, see the [Presentation README](../../README.md). For overall system architecture, see the [Root README](../../../../README.md).

This folder contains the standalone interactive workflow assets used by Slide 4 ("Complete Workflow") of the EdgeShield presentation app:

* `index.html`: Main interactive HTML5 simulation canvas and DOM controls.
* `script.js`: State animation engine illustrating live packet flow from edge nodes through ingestion and Databricks lakehouse layers.
* `style.css`: Clean, dark theme styles aligned with the presentation UI.
* `databricks_workflow.svg`: Architectural vector diagram asset.

Slide 4 renders `index.html` directly inside a full-size responsive iframe with live simulation controls.
