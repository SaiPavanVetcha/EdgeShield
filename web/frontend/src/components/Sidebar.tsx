import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Settings,
  Shield,
  Radio,
} from 'lucide-react';
import { HealthResponse } from '../types';

interface SidebarProps {
  health?: HealthResponse | null;
  activeAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ health, activeAlertsCount }) => {
  // STRICT REQUIREMENT: Only these 4 items in this exact order
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/devices',
      label: 'Devices',
      icon: Server,
    },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const getStatusDot = () => {
    if (!health) return 'bg-slate-500';
    if (!health.configured) return 'bg-amber-500';
    if (health.warehouse_status === 'online') return 'bg-emerald-400 animate-pulse';
    if (health.warehouse_status === 'starting') return 'bg-amber-400 animate-pulse';
    return 'bg-rose-500';
  };

  const getStatusText = () => {
    if (!health) return 'Connecting...';
    if (!health.configured) return 'Unconfigured';
    if (health.warehouse_status === 'online') return 'Warehouse Online';
    if (health.warehouse_status === 'starting') return 'Waking Up...';
    if (health.warehouse_status === 'stopped') return 'Warehouse Stopped';
    return 'Connection Error';
  };

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0 select-none">
      <div>
        {/* Brand / Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-100 tracking-tight text-base">EdgeShield</span>
            <span className="block text-[10px] text-slate-400 font-mono tracking-wider uppercase">Telemetry Gold</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800/90 text-sky-400 border border-slate-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Warehouse Status Pill at bottom */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-slate-400" />
              Databricks SQL
            </span>
            <span className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
          </div>
          <p className="text-slate-200 font-medium truncate">{getStatusText()}</p>
          {health?.last_query_ms && (
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              Ping: {health.last_query_ms}ms
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
