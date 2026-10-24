import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { HealthResponse } from './types';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  useEffect(() => {
    const fetchGlobalStatus = async () => {
      try {
        const [h, a] = await Promise.all([api.getHealth(), api.getAlerts()]);
        setHealth(h);
        setActiveAlertsCount(a.active_count);
      } catch {
        // silent
      }
    };

    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 antialiased">
        {/* Exact Sidebar with exact 4 items in exact order */}
        <Sidebar health={health} activeAlertsCount={activeAlertsCount} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
