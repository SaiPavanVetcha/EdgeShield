import React from 'react';
import { ShieldCheck, Keyboard, ChevronDown } from 'lucide-react';
import type { SlideData } from '../types';

interface HeaderProps {
  currentSlide: number;
  totalSlides: number;
  slides: SlideData[];
  onSelectSlide: (index: number) => void;
  onOpenKeyboardHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSlide,
  totalSlides,
  slides,
  onSelectSlide,
  onOpenKeyboardHelp,
}) => {
  const progressPercent = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      {/* Top Thin Progress Line */}
      <div className="h-0.5 w-full bg-slate-900">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-400 transition-all duration-300 shadow-glow-cyan"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-base tracking-tight text-white">EdgeShield</span>
            <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest hidden sm:inline">Telemetry Platform</span>
          </div>
        </div>

        {/* Center: Slide Category Tag / Quick Jumper */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 glass-panel px-3 py-1 rounded-full border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-cyan-300 font-semibold">{slides[currentSlide].category}</span>
          <span className="text-slate-600">•</span>
          <select
            value={currentSlide}
            onChange={(e) => onSelectSlide(Number(e.target.value))}
            className="bg-transparent text-slate-200 outline-none cursor-pointer font-medium hover:text-cyan-300"
          >
            {slides.map((s, idx) => (
              <option key={s.id} value={idx} className="bg-space-900 text-slate-200">
                {s.id}. {s.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-500 pointer-events-none -ml-1" />
        </div>

        {/* Right: Keyboard Shortcuts Hint */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenKeyboardHelp}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-space-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
            title="View Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Shortcuts</span>
            <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">?</span>
          </button>
        </div>
      </div>
    </header>
  );
};
