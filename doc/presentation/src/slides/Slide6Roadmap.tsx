import React from 'react';
import { Milestone, CheckCircle2, Bot, BrainCircuit, Activity } from 'lucide-react';

export const Slide6Roadmap: React.FC = () => {
  return (
    <div className="flex flex-col justify-center h-full max-w-6xl mx-auto px-6 select-none">
      {/* Title */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Milestone className="w-3.5 h-3.5 text-blue-400" />
          <span>Product Evolution</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          EdgeShield Roadmap
        </h2>
        <p className="text-base text-slate-400 mt-2 max-w-2xl">
          Progressive intelligence evolving from deterministic observability to conversational AI.
        </p>
      </div>

      {/* 3 Evolution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* V1 Card */}
        <div className="glass-panel p-6 rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-cyan-950/20 to-transparent relative shadow-glow-cyan flex flex-col justify-between">
          <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[11px] font-bold uppercase tracking-wider">
            Current Release
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Activity className="w-6 h-6" />
            </div>

            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Phase 1</div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              V1: Core Observability
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Real-time monitoring and deterministic threshold alerting on Gold layer facts.
            </p>

            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Clean KPI Dashboard:</strong> CPU, RAM, Disk, Battery, and Environment gauges.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Device Selector:</strong> Dynamic filters with configurable time ranges.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Rules-Based Alerts:</strong> Instant notifications for critical limits.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-cyan-300">
            Status: Fully Operational
          </div>
        </div>

        {/* V2 Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>

            <div className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-1">Phase 2</div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              V2: ML Anomaly Detection
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Unsupervised machine learning running against historical Gold telemetry.
            </p>

            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Real Gold Data Training:</strong> Isolation Forests and Autoencoders on fact tables.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Dynamic Baselines:</strong> Automatically accounts for seasonal and diurnal shifts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Subtle Drift Detection:</strong> Catches memory leaks and battery degradation early.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-blue-400">
            Status: Model Architecture Defined
          </div>
        </div>

        {/* V3 Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Bot className="w-6 h-6" />
            </div>

            <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">Phase 3</div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              V3: Natural Language Queries
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Conversational intelligence layer querying Lakehouse Gold tables on demand.
            </p>

            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Text-to-SQL over Gold:</strong> Query fact tables with plain English prompts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Instant Diagnostics:</strong> &quot;Which ESP32 nodes had thermal spikes this week?&quot;</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Root-Cause Summaries:</strong> LLM-synthesized incident briefings in seconds.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-emerald-400">
            Status: Next-Gen Roadmap
          </div>
        </div>
      </div>
    </div>
  );
};
