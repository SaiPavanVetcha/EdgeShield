import React from 'react';
import { ServerOff, FileQuestion, GitFork, AlertTriangle } from 'lucide-react';

export const Slide2Problem: React.FC = () => {
  return (
    <div className="flex flex-col justify-center h-full max-w-6xl mx-auto px-6 select-none">
      {/* Category & Title */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>The Core Challenge</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Why Edge Telemetry Fails Today
        </h2>
        <p className="text-base text-slate-400 mt-2 max-w-2xl">
          Traditional APM and observability stacks collapse when applied to mixed edge devices.
        </p>
      </div>

      {/* 3 Main Problem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-rose-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
              <ServerOff className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-1">Architecture Mismatch</div>
            <h3 className="text-lg font-bold text-white mb-3">
              Server-First Monitoring Tools
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Designed for high-resource servers, not low-power edge nodes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Incapable of natively correlating PC hosts with microcontrollers (ESP32).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Heavy agent footprints that drain edge battery and compute.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-500">
            Impact: High latency &amp; partial visibility
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">Data Chaos</div>
            <h3 className="text-lg font-bold text-white mb-3">
              Raw &amp; Unstructured Payloads
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Inconsistent JSON structures across device types and OS versions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Mixed timestamps, uncalibrated sensor values, and missing units.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>High noise-to-signal ratio makes root-cause analysis impossible.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-500">
            Impact: Query timeouts &amp; brittle dashboards
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
              <GitFork className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Missing Link</div>
            <h3 className="text-lg font-bold text-white mb-3">
              No Clean Path to Decisions
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Raw edge logs are dumped directly into ad-hoc visualization charts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>No clean separation between raw ingestion, cleaning, and analytics.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Cannot scale to rules-based alerts or machine learning anomaly models.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-500">
            Impact: Alert fatigue &amp; zero ML readiness
          </div>
        </div>
      </div>
    </div>
  );
};
