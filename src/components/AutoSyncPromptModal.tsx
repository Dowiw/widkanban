import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { X, RefreshCw, Bell, Clock, ShieldCheck } from 'lucide-react';

export const AutoSyncPromptModal: React.FC = () => {
  const {
    isAutoSyncPromptOpen,
    setAutoSyncPromptOpen,
    autoSyncSettings,
    setAutoSyncSettings,
  } = useTaskStore();

  const [intervalMinutes, setIntervalMinutes] = useState(autoSyncSettings.intervalMinutes || 3);
  const [notifyOnNewTasks, setNotifyOnNewTasks] = useState(autoSyncSettings.notifyOnNewTasks ?? true);

  if (!isAutoSyncPromptOpen) return null;

  const handleEnable = () => {
    setAutoSyncSettings({
      enabled: true,
      intervalMinutes,
      notifyOnNewTasks,
      hasPrompted: true,
    });
    setAutoSyncPromptOpen(false);
  };

  const handleDecline = () => {
    setAutoSyncSettings({
      enabled: false,
      hasPrompted: true,
    });
    setAutoSyncPromptOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 text-slate-100 border border-slate-700/60 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <RefreshCw size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 leading-tight">
                Background Auto-Sync
              </h2>
              <p className="text-xs text-slate-400">Stay up to date with remote assignments</p>
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
            WidKanban can periodically check your connected accounts for newly assigned GitHub
            issues, PR reviews, and Google Tasks in the background.
          </p>

          <div className="p-3 bg-slate-800/60 border border-slate-700/40 rounded-xl flex flex-col gap-3">
            {/* Interval Selection */}
            <div>
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Clock size={13} className="text-indigo-400" />
                Polling Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 1, label: '1 minute' },
                  { value: 3, label: '3 minutes (Recommended)' },
                  { value: 5, label: '5 minutes' },
                  { value: 15, label: '15 minutes' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntervalMinutes(opt.value)}
                    className={`py-1.5 px-2.5 text-xs rounded-lg border text-left transition-all ${
                      intervalMinutes === opt.value
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200 font-medium'
                        : 'border-slate-700/60 bg-slate-900/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Notification Toggle */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-700/40">
              <input
                type="checkbox"
                checked={notifyOnNewTasks}
                onChange={(e) => setNotifyOnNewTasks(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span className="text-xs text-slate-300 flex items-center gap-1.5 select-none">
                <Bell size={13} className="text-indigo-400" />
                Show desktop notification on newly detected tasks
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>Non-blocking polling with automatic rate-limit backoff. You can adjust this anytime in Settings.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDecline}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            Keep Manual Only
          </button>
          <button
            type="button"
            onClick={handleEnable}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            Enable Auto-Sync
          </button>
        </div>
      </div>
    </div>
  );
};
