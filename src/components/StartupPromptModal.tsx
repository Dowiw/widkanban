import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { X, Power, Check, Monitor } from 'lucide-react';

export const StartupPromptModal: React.FC = () => {
  const {
    isStartupPromptOpen,
    setStartupPromptOpen,
    startupSettings,
    setStartupSettings,
    enableAutostart,
  } = useTaskStore();

  const [startMinimized, setStartMinimized] = useState(
    startupSettings.startMinimized ?? false
  );
  const [isEnabling, setIsEnabling] = useState(false);

  if (!isStartupPromptOpen) return null;

  const handleEnable = async () => {
    setIsEnabling(true);
    await enableAutostart(startMinimized);
    setIsEnabling(false);
    setStartupPromptOpen(false);
  };

  const handleDecline = () => {
    setStartupSettings({
      autostartEnabled: false,
      hasPrompted: true,
    });
    setStartupPromptOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 text-slate-100 border border-slate-700/60 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Power size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 leading-tight">
                Launch on System Startup
              </h2>
              <p className="text-xs text-slate-400">Keep your Kanban board ready at all times</p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
          <p>
            Would you like WidKanban to launch automatically when you turn on your computer?
            This keeps your GitHub assignments and Google Tasks instantly accessible right on your desktop.
          </p>

          <div className="p-3 bg-slate-800/60 border border-slate-700/40 rounded-xl flex flex-col gap-3">
            {/* Start Minimized Option */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) => setStartMinimized(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/30 bg-slate-900"
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200">
                  Start Minimized to System Tray
                </span>
                <span className="text-[11px] text-slate-400">
                  Launches silently in the background on startup without stealing window focus.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Monitor size={12} className="text-indigo-400 shrink-0" />
            <span>
              Supports Windows (Registry), macOS (LaunchAgent), and Linux (XDG Autostart).
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDecline}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isEnabling}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Check size={14} />
            <span>{isEnabling ? 'Enabling...' : 'Launch on Startup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
