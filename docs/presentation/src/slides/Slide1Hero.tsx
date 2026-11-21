import React from 'react';
import { Cpu, Database, Activity, ShieldCheck, ChevronRight, Layers, ArrowRight } from 'lucide-react';

interface SlideProps {
  onNext: () => void;
}

export const Slide1Hero: React.FC<SlideProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-6xl mx-auto px-6 text-center select-none">
      {/* Top Project Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-8 shadow-glow-cyan">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>End-to-End Edge Telemetry Platform</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6">
        Edge<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400">Shield</span>
      </h1>

      {/* Hero Tagline */}
      <div className="flex items-center justify-center flex-wrap gap-2 text-xl sm:text-2xl lg:text-3xl font-medium text-slate-300 mb-12">
        <span className="text-cyan-300 font-semibold">Edge Devices</span>
        <ArrowRight className="w-5 h-5 text-slate-500" />
        <span className="text-blue-400 font-semibold">Lakehouse</span>
        <ArrowRight className="w-5 h-5 text-slate-500" />
        <span className="text-emerald-400 font-semibold">Intelligent Monitoring</span>
      </div>

      {/* 4 Architecture Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-12">
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl text-left border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase font-mono text-cyan-400/80 mb-1">Source Tier</div>
          <h3 className="text-base font-bold text-white mb-1">Mixed Edge Clients</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            PC agent (Python) and ESP32 microcontroller firmware collecting telemetry in unison.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl text-left border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase font-mono text-blue-400/80 mb-1">Gateway</div>
          <h3 className="text-base font-bold text-white mb-1">FastAPI Hub</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            High-throughput async endpoint validating and decoupling edge sensors from storage.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl text-left border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase font-mono text-amber-400/80 mb-1">Lakehouse</div>
          <h3 className="text-base font-bold text-white mb-1">Databricks Medallion</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-stage pipeline: Bronze (Raw) → Silver (Cleaned) → Gold (Star Schema).
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-5 rounded-2xl text-left border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase font-mono text-emerald-400/80 mb-1">Consumption</div>
          <h3 className="text-base font-bold text-white mb-1">Clean Gold Access</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Downstream monitoring and alerts read exclusively from curated Gold-layer facts.
          </p>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onNext}
        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-glow-cyan cursor-pointer active:scale-95"
      >
        <span>Explore Architecture</span>
        <ChevronRight className="w-4 h-4 text-slate-950" />
      </button>
    </div>
  );
};
