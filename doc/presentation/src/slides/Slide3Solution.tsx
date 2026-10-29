import React from 'react';
import { Cpu, Layers, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

export const Slide3Solution: React.FC = () => {
  return (
    <div className="flex flex-col justify-center h-full max-w-6xl mx-auto px-6 select-none">
      {/* Title */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>The EdgeShield Solution</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Unified Edge-to-Lakehouse Architecture
        </h2>
        <p className="text-base text-slate-400 mt-2 max-w-2xl">
          A disciplined, production-grade telemetry pipeline built on four robust pillars.
        </p>
      </div>

      {/* 4 Solution Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                PILLAR 01
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Lightweight Dual Edge Clients
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">PC Agent (Python):</strong> Efficient background daemon harvesting CPU, RAM, and Disk metrics.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">ESP32 Firmware:</strong> Low-power C++/MicroPython driver streaming battery and environmental data.</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-cyan-400/80">
            Zero bloat • Non-blocking async telemetry push
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-950/80 border border-blue-500/30 text-blue-300">
                PILLAR 02
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Full Medallion on Databricks
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Bronze:</strong> Immutable raw ingest preserves source payload integrity.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Silver:</strong> Strict schema enforcement, deduplication, and timestamp normalization.</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-blue-400/80">
            ACID transactions • Delta Lake reliability
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
                PILLAR 03
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Analytics-Ready Gold Layer
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Star Schema:</strong> Single <code className="text-amber-300 text-xs">dim_device</code> joined to five specialized <code className="text-amber-300 text-xs">fact_*</code> tables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Pure Decoupling:</strong> Downstream consumers only read curated Gold tables.</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-amber-400/80">
            Sub-second query latency • Zero impact on ingestion
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                PILLAR 04
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Progressive Intelligence
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">V1 (Current):</strong> Deterministic KPI dashboards and threshold alerting.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">V2 → V3:</strong> Unsupervised ML anomaly detection + Natural Language lakehouse queries.</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-emerald-400/80">
            Modular evolution • Backward compatible schema
          </div>
        </div>
      </div>
    </div>
  );
};
