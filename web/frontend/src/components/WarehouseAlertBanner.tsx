import React from 'react';
import { AlertCircle, PlayCircle, Loader2, KeyRound, Sparkles } from 'lucide-react';

interface WarehouseAlertBannerProps {
  warehouseStatus: string;
  message?: string;
  onWakeUp: () => void;
  isWakingUp: boolean;
}

export const WarehouseAlertBanner: React.FC<WarehouseAlertBannerProps> = ({
  warehouseStatus,
  message,
  onWakeUp,
  isWakingUp,
}) => {
  if (warehouseStatus === 'online') return null;

  if (warehouseStatus === 'unconfigured') {
    return (
      <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 mb-6 text-amber-200">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-300">Databricks Credentials Not Configured</h4>
            <p className="text-xs text-amber-200/80 mt-1">
              Backend is running, but Databricks SQL Warehouse connection details are missing. Configure <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">DATABRICKS_HOST</code>, <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">DATABRICKS_HTTP_PATH</code>, and <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">DATABRICKS_TOKEN</code> in your backend <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">.env</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (warehouseStatus === 'starting' || isWakingUp) {
    return (
      <div className="bg-sky-950/40 border border-sky-800/70 rounded-xl p-4 mb-6 shadow-lg shadow-sky-950/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-sky-200 flex items-center gap-2">
                Starting Databricks SQL Warehouse...
              </h4>
              <p className="text-xs text-sky-300/80 mt-0.5">
                The compute node is initializing from idle auto-stop. This typically completes within 15–45 seconds. Polling telemetry automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-300 bg-sky-900/40 px-3 py-1.5 rounded-lg border border-sky-700/50">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Initializing
          </div>
        </div>
      </div>
    );
  }

  // Warehouse is stopped
  return (
    <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-5 mb-6 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-amber-200">
                Databricks SQL Warehouse is Sleeping
              </h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                Free Tier Idle Stop
              </span>
            </div>
            <p className="text-xs text-amber-300/80 mt-1 max-w-2xl">
              The warehouse auto-stopped to conserve cloud compute credits. Click the button below to send a wake-up ping. The dashboard will automatically reconnect once the warehouse is ready.
            </p>
          </div>
        </div>

        <button
          onClick={onWakeUp}
          disabled={isWakingUp}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 flex-shrink-0"
        >
          {isWakingUp ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Waking Compute...</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 text-slate-950" />
              <span>Wake Up Warehouse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
