import React from 'react';
import { Database, Clock, Zap, TableProperties } from 'lucide-react';

export const Slide5GoldLayer: React.FC = () => {
  const goldTables = [
    {
      name: 'dim_device',
      type: 'DIMENSION',
      typeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Central hardware dimension with metadata & configuration.',
      columns: ['device_id (PK)', 'device_type (PC / ESP32)', 'os_version', 'firmware_version', 'status']
    },
    {
      name: 'fact_cpu_telemetry',
      type: 'FACT (PC)',
      typeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Host processor utilization & load characteristics.',
      columns: ['timestamp', 'device_id (FK)', 'cpu_percent', 'core_count', 'freq_mhz']
    },
    {
      name: 'fact_ram_telemetry',
      type: 'FACT (PC)',
      typeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Physical & swap memory consumption metrics.',
      columns: ['timestamp', 'device_id (FK)', 'used_bytes', 'available_bytes', 'percent_used']
    },
    {
      name: 'fact_disk_telemetry',
      type: 'FACT (PC)',
      typeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Drive capacity, partition utilization, and I/O rates.',
      columns: ['timestamp', 'device_id (FK)', 'disk_used_percent', 'read_bytes_sec', 'write_bytes_sec']
    },
    {
      name: 'fact_battery_telemetry',
      type: 'FACT (ESP32)',
      typeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Power metrics, voltage levels, and discharge state.',
      columns: ['timestamp', 'device_id (FK)', 'battery_percent', 'voltage_mv', 'is_charging']
    },
    {
      name: 'fact_environment_telemetry',
      type: 'FACT (ESP32)',
      typeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Ambient sensor readings captured at the edge.',
      columns: ['timestamp', 'device_id (FK)', 'temperature_c', 'humidity_percent', 'rssi_dbm']
    },
  ];

  return (
    <div className="flex flex-col justify-center h-full max-w-6xl mx-auto px-6 select-none">
      {/* Title */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>Lakehouse Data Model</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Gold Layer &amp; Why It Matters
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          A disciplined star schema decoupling heterogeneous ingest from high-speed analytical queries.
        </p>
      </div>

      {/* 3 Core Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <TableProperties className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Star Schema Design</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              1 Dimension + 5 Fact tables eliminate nested JSON parsing overhead during queries.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Independent Timestamps</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              PC and ESP32 stream asynchronously at their own sample rates without locking or skew.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Analytics &amp; ML Ready</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized data formats enable rules-based alerting and unsupervised anomaly models.
            </p>
          </div>
        </div>
      </div>

      {/* 6 Schema Table Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {goldTables.map((tbl) => (
          <div
            key={tbl.name}
            className="glass-panel p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-white truncate">{tbl.name}</span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${tbl.typeColor}`}>
                  {tbl.type}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                {tbl.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 font-mono text-[11px] text-slate-400">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Key Fields:</span>
              <div className="flex flex-wrap gap-1">
                {tbl.columns.map((col, idx) => (
                  <span key={idx} className="bg-space-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
