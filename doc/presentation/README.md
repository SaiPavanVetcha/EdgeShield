# EdgeShield — Project Presentation Website

A clean, modern, modular presentation website showcasing the complete **EdgeShield** edge-to-lakehouse telemetry platform.

Built with **Vite + React + TypeScript + Tailwind CSS**.

---

## ⚡ Interactive Workflow Assets

Place your interactive workflow files in `public/workflow/`:
- `index.html` (Primary interactive workflow demo)
- `script.js`
- `style.css`

Slide 4 ("Complete Workflow") directly embeds `public/workflow/index.html` inside a clean, responsive, full-size viewport iframe with live controls.

---

## 🚀 Running the Presentation Locally

From the `presentation/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start the local presentation server
npm run dev
```

Open your browser to the local URL (e.g. `http://localhost:5173`).

---

## ⌨️ Presentation Keyboard Controls

| Key | Action |
| :--- | :--- |
| **`→`** or **`Space`** or **`PageDown`** | Advance to Next Slide |
| **`←`** or **`Backspace`** or **`PageUp`** | Return to Previous Slide |
| **`1`** – **`7`** | Jump directly to Slide 1 through 7 |
| **`F`** | Toggle Fullscreen Mode |
| **`?`** | Open / Close Keyboard Shortcuts Guide |
| **`Esc`** | Close Lightbox or Modal |

---

## 📊 Presentation Structure (7 Slides)

1. **Title / Hero** — EdgeShield: *Edge Devices → Lakehouse → Intelligent Monitoring*
2. **The Problem** — Server-centric tools fail on edge, unstructured telemetry, no clean path to decisions
3. **Solution Overview** — Dual edge clients, full Databricks medallion architecture, Gold layer, progressive intelligence
4. **Complete Workflow** — Interactive embedded architecture demo (`public/workflow/index.html`) showcasing the end-to-end telemetry pipeline
5. **Gold Layer & Why It Matters** — Star schema (`dim_device` + 5 `fact_*` tables), independent timestamps, and ML readiness
6. **Version Roadmap** — V1 (KPI dashboard & rules), V2 (ML anomaly detection), V3 (Natural language queries)
7. **Summary & Closing** — EdgeShield recap, key architectural pillars, and thank you

---

## 📁 Modular Directory Structure

```
presentation/
├── public/
│   ├── favicon.svg
│   └── workflow/                  ← Interactive workflow files
│       ├── index.html
│       ├── script.js
│       ├── style.css
│       └── README.md
├── src/
│   ├── components/
│   │   ├── Header.tsx             # Ambient header & progress indicator
│   │   ├── Navigation.tsx         # Bottom progress dots & slide counter
│   │   ├── LightboxModal.tsx      # Fullscreen diagram zoom
│   │   └── KeyboardModal.tsx      # Keyboard shortcut guide
│   ├── slides/
│   │   ├── Slide1Hero.tsx         # Slide 1: Hero & Architecture Highlights
│   │   ├── Slide2Problem.tsx      # Slide 2: Core Telemetry Challenges
│   │   ├── Slide3Solution.tsx     # Slide 3: 4 Solution Pillars
│   │   ├── Slide4Workflow.tsx     # Slide 4: Interactive Workflow Iframe
│   │   ├── Slide5GoldLayer.tsx    # Slide 5: Star Schema & Fact Tables
│   │   ├── Slide6Roadmap.tsx      # Slide 6: V1 → V2 → V3 Roadmap
│   │   └── Slide7Closing.tsx      # Slide 7: Closing & Takeaways
│   ├── App.tsx                    # State machine & keyboard orchestration
│   ├── index.css                  # Design system, glassmorphism, animations
│   ├── main.tsx                   # React root entrypoint
│   └── types.ts                   # Slide and asset type definitions
├── package.json
└── tailwind.config.js
```
