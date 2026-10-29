import React from 'react';
import { ShieldCheck, RotateCcw, Cpu, Database, Sparkles } from 'lucide-react';

interface Slide7Props {
  onRestart: () => void;
}

export const Slide7Closing: React.FC<Slide7Props> = ({ onRestart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto px-6 text-center select-none">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-6 shadow-glow-cyan">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>Platform Summary</span>
      </div>

      {/* Main Title */}
      <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight mb-4">
        Edge<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400">Shield</span>
      </h2>

      {/* Short Closing Statement */}
      <p className="text-xl sm:text-2xl font-medium text-slate-300 max-w-2xl mb-10 leading-relaxed">
        Transforming fragmented edge signals into structured, decision-ready Lakehouse intelligence.
      </p>

      {/* 3 Key Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-10 text-left">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Unified Mixed Edge</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Correlates PC host health with microcontroller IoT telemetry without heavy agent overhead.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Pure Lakehouse Standard</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bronze, Silver, and Gold guarantee raw data immutability, ACID safety, and star schema speed.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Built to Scale</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Architected to seamlessly evolve from V1 KPI alerts to V2 ML models and V3 conversational queries.
          </p>
        </div>
      </div>

      {/* Thank You & Presentation Reset */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
          Thank You
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Questions &amp; Discussion
        </p>

        <button
          onClick={onRestart}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Restart Presentation</span>
        </button>
      </div>
    </div>
  );
};
