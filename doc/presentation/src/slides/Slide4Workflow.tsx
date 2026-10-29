import React from 'react';
import { 
  GitCommit, 
  Cpu, 
  Server, 
  Database, 
  Layers, 
  Activity, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Slide4WorkflowProps {
  onOpenLightbox?: (src: string, title: string) => void;
}

export const Slide4Workflow: React.FC<Slide4WorkflowProps> = () => {
  const handleOpenWorkflow = () => {
    window.open('/workflow/index.html', '_blank');
  };

  const workflowStages = [
    {
      number: '01',
      stage: 'EDGE SOURCES',
      title: 'PC Client + ESP32',
      icon: Cpu,
      badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/50',
      iconColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      accentBorder: 'hover:border-cyan-500/40',
      bullets: [
        'Python daemon captures PC CPU, RAM, and Disk metrics via psutil.',
        'ESP32 C++ firmware streams battery state and ambient sensor metrics.',
        'Non-blocking async telemetry push with hardware timestamps.'
      ]
    },
    {
      number: '02',
      stage: 'INGESTION',
      title: 'FastAPI Server',
      icon: Server,
      badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-950/50',
      iconColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      accentBorder: 'hover:border-blue-500/40',
      bullets: [
        'High-throughput asynchronous REST gateway decoupling edge from Lakehouse.',
        'Token authentication, header verification, and schema validation.',
        'Fast ingestion buffer preventing network backpressure on edge devices.'
      ]
    },
    {
      number: '03',
      stage: 'LAKEHOUSE RAW',
      title: 'Bronze Layer',
      icon: Database,
      badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-950/50',
      iconColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      accentBorder: 'hover:border-amber-500/40',
      bullets: [
        'Immutable append-only raw store preserving incoming JSON payloads.',
        'Audit-ready raw data retention guaranteeing zero telemetry loss.',
        'Enables reproducible replay and re-processing of downstream tables.'
      ]
    },
    {
      number: '04',
      stage: 'LAKEHOUSE CLEAN',
      title: 'Silver Layer',
      icon: Layers,
      badgeColor: 'border-slate-400/30 text-slate-300 bg-slate-900/60',
      iconColor: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
      accentBorder: 'hover:border-slate-400/40',
      bullets: [
        'Strict schema enforcement, deduplication, and typing on Delta Lake.',
        'Reconciles independent PC and ESP32 sampling frequencies.',
        'Cleansed tabular dataset optimized for business aggregations.'
      ]
    },
    {
      number: '05',
      stage: 'STAR SCHEMA',
      title: 'Gold Layer',
      icon: Database,
      badgeColor: 'border-yellow-500/30 text-yellow-300 bg-yellow-950/50',
      iconColor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      accentBorder: 'hover:border-yellow-500/40',
      bullets: [
        'Curated dimensional star schema: dim_device + 5 specialized fact tables.',
        'Pre-aggregated structures deliver sub-second analytical queries.',
        'Decoupled analytics foundation powering dashboards and ML models.'
      ]
    },
    {
      number: '06',
      stage: 'SERVING',
      title: 'Serving Layer',
      icon: Activity,
      badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/50',
      iconColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      accentBorder: 'hover:border-emerald-500/40',
      bullets: [
        'Monitoring tools and query engines read exclusively from Gold facts.',
        'Live health dashboards with device selectors and dynamic time windows.',
        'Deterministic rules-based alerts trigger on critical metric thresholds.'
      ]
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-2 select-none">
      {/* Slide Header */}
      <div className="mb-4 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
          <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pipeline Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          Complete End-to-End Workflow
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Edge devices stream through Databricks Medallion layers into decision-ready Gold serving.
        </p>
      </div>

      {/* 6 Clean Explanatory Stage Cards (3x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3.5">
        {workflowStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.number}
              className={`glass-panel p-3.5 rounded-xl border border-slate-800/90 ${stage.accentBorder} transition-all flex flex-col justify-between`}
            >
              <div>
                {/* Card Top: Number, Icon, Stage Tag */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                    STAGE {stage.number}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${stage.iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="mb-1.5">
                  <span className={`inline-block text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${stage.badgeColor} mb-1`}>
                    {stage.stage}
                  </span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {stage.title}
                  </h3>
                </div>

                {/* Bullets */}
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {stage.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Call-to-Action Card */}
      <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-space-900 to-blue-950/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-glow-cyan">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white">Interactive Architecture Simulation</h4>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono">
                Live Demo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Launch the live interactive topology with real-time packet flow, PC-01–PC-04 node telemetry, and ESP32 environmental sensors in a dedicated tab.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenWorkflow}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-glow-cyan cursor-pointer active:scale-95 shrink-0"
        >
          <span>Open Interactive Workflow</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
        </button>
      </div>

      {/* Sequence Breadcrumb */}
      <div className="mt-2.5 flex items-center justify-center text-[10px] font-mono text-slate-500">
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-cyan-400 font-semibold">Edge Sources</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-blue-400 font-semibold">FastAPI</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-amber-400 font-semibold">Bronze Raw</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-slate-300 font-semibold">Silver Clean</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-yellow-300 font-semibold">Gold Star Schema</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-emerald-400 font-semibold">Serving &amp; Alerts</span>
        </div>
      </div>
    </div>
  );
};
