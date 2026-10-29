import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardModal: React.FC<KeyboardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '→  or  Space', action: 'Advance to next slide' },
    { key: '←  or  Backspace', action: 'Return to previous slide' },
    { key: '1  -  7', action: 'Jump directly to slide 1 through 7' },
    { key: 'F', action: 'Toggle Fullscreen mode' },
    { key: 'Esc', action: 'Close modal or lightboxes' },
    { key: '?', action: 'Open / Close shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-cyan-400">
            <Keyboard className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Presentation Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-space-900 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{sc.action}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300 text-[11px] shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
