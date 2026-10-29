import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface LightboxModalProps {
  isOpen: boolean;
  src: string;
  title: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ isOpen, src, title, onClose }) => {
  const [scale, setScale] = useState(1);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide text-cyan-300 font-mono">ASSET VIEW</span>
          <span className="text-slate-500">|</span>
          <span className="text-sm font-medium text-slate-200 truncate max-w-md">{title}</span>
        </div>

        {/* Zoom Controls & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-6 bg-slate-700 mx-1" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Container with Scroll & Pan */}
      <div className="w-full h-full flex items-center justify-center overflow-auto p-12">
        <img
          src={src}
          alt={title}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
        />
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-500">
        Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">ESC</kbd> to return to presentation
      </div>
    </div>
  );
};
