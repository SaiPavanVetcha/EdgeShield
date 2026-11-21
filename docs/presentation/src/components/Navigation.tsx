import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { SlideData } from '../types';

interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  slides: SlideData[];
  onPrev: () => void;
  onNext: () => void;
  onSelectSlide: (index: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentSlide,
  totalSlides,
  slides,
  onPrev,
  onNext,
  onSelectSlide,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 px-6 py-4 pointer-events-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Left: Slide Counter & Title */}
        <div className="hidden sm:flex items-center gap-3 glass-panel px-3.5 py-1.5 rounded-full border border-slate-800 text-xs font-mono">
          <span className="text-cyan-400 font-bold">
            {String(currentSlide + 1).padStart(2, '0')}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">
            {String(totalSlides).padStart(2, '0')}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-sans font-medium truncate max-w-[140px] md:max-w-xs">
            {slides[currentSlide].title}
          </span>
        </div>

        {/* Center: Interactive Progress Dots */}
        <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-full border border-slate-800 shadow-glass-card mx-auto sm:mx-0">
          {slides.map((slide, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={slide.id}
                onClick={() => onSelectSlide(idx)}
                title={`${slide.id}. ${slide.title}`}
                className={`group relative flex items-center justify-center p-1 cursor-pointer transition-all ${
                  isActive ? 'scale-110' : 'hover:scale-125 opacity-60 hover:opacity-100'
                }`}
              >
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-8 bg-gradient-to-r from-cyan-400 to-blue-500 shadow-glow-cyan'
                      : 'w-2.5 bg-slate-600 group-hover:bg-slate-400'
                  }`}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200 font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {slide.id}. {slide.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Arrows & Fullscreen Controls */}
        <div className="flex items-center gap-1.5 glass-panel p-1 rounded-full border border-slate-800">
          <button
            onClick={onPrev}
            disabled={currentSlide === 0}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              currentSlide === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              currentSlide === totalSlides - 1
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
            title="Next Slide (Right Arrow or Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </footer>
  );
};
