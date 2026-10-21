import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { 
  X, 
  Github, 
  CheckSquare, 
  KeyRound, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Tag,
  Palette,
  Maximize2,
  SlidersHorizontal,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Square,
  Sparkles,
  Type,
  Clock,
  Bell,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { FontFamilyOption, CardDensity, ThemeMode } from '../types/task';

type SettingsTab = 'integrations' | 'sync' | 'appearance' | 'window' | 'advanced';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    setSettingsOpen, 
    setGithubSetupOpen,
    authStatus, 
    saveCredentials, 
    clearCredentials,
    fetchGoogleTasks,
    fetchGithubTasks,
    setCompletedOnboarding,
    customization,
    setCustomization,
    isPinned,
    setWindowSizePreset,
    resetWindowPositionAndSize,
    autoSyncSettings,
    setAutoSyncSettings,
    apiHealth,
    fetchApiHealth,
    refreshTasks,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [githubToken, setGithubToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [resetWindowDone, setResetWindowDone] = useState(false);

  useEffect(() => {
    if (activeTab === 'sync') {
      fetchApiHealth();
    }
  }, [activeTab, fetchApiHealth]);

  if (!isSettingsOpen) return null;

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    await saveCredentials({
      githubToken: githubToken.trim() || undefined,
      googleToken: googleToken.trim() || undefined,
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setGithubToken('');
    setGoogleToken('');
    setCompletedOnboarding(true);

    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  const handleDisconnect = async (provider: 'github' | 'google') => {
    await clearCredentials(provider);
  };

  const handleFetchGoogleTasks = async () => {
    setIsFetchingGoogle(true);
    await fetchGoogleTasks();
    setIsFetchingGoogle(false);
  };

  const handleFetchGithubTasks = async () => {
    setIsFetchingGithub(true);
    await fetchGithubTasks();
    setIsFetchingGithub(false);
  };

  const handleClose = () => {
    setCompletedOnboarding(true);
    setSettingsOpen(false);
  };

  const handleResetWindow = async () => {
    await resetWindowPositionAndSize();
    setResetWindowDone(true);
    setTimeout(() => setResetWindowDone(false), 1200);
  };

  const fontOptions: { id: FontFamilyOption; label: string; preview: string; description: string }[] = [
    { id: 'outfit', label: 'Modern Sans', preview: 'Outfit', description: 'Clean, elegant, modern UI' },
    { id: 'unifont', label: 'GNU Unifont', preview: 'Unifont', description: 'Classic bitmap pixel typeface' },
    { id: 'system', label: 'System UI', preview: 'Inter / Native', description: 'Native OS system typeface' },
    { id: 'mono', label: 'Coding Mono', preview: 'Consolas', description: 'Fixed-pitch developer monospace' },
  ];

  const cornerPresets = [
    { label: 'Sharp (0px)', value: 0 },
    { label: 'Subtle (4px)', value: 4 },
    { label: 'Default (16px)', value: 16 },
    { label: 'Round (24px)', value: 24 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-2xl p-4 text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                WidKanban Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customization, appearance & provider sync
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-100 dark:border-slate-800 py-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'integrations'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'sync'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Auto-Sync & Quota</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('window')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'window'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Window</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'advanced'
                ? 'bg-indigo-600 text-white shadow-xs dark:bg-indigo-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Advanced</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 1: INTEGRATIONS */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'integrations' && (
            <form onSubmit={handleSaveIntegrations} className="space-y-4">
              {/* Security Notice */}
              <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Credentials are saved strictly in your local native OS storage and never transmitted to third-party servers.
                </span>
              </div>

              {/* GitHub PAT Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Github className="h-4 w-4 text-slate-800 dark:text-slate-100" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">GitHub Personal Access Token</span>
                  </div>
                  {authStatus.has_github ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <Check className="h-2.5 w-2.5" />
                        <span>Connected</span>
                      </span>
                      {authStatus.github_from_env && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80" title="Token loaded from .env environment variable">
                          .env (Dev Mode)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleFetchGithubTasks}
                        disabled={isFetchingGithub}
                        title="Sync GitHub Issues"
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFetchingGithub ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect('github')}
                        title="Disconnect GitHub"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300">
                      Not Configured
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showGithub ? 'text' : 'password'}
                    placeholder={authStatus.has_github ? '•••••••••••••••• (Leave blank to keep current)' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithub(!showGithub)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showGithub ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Required scope: <code>repo</code></span>
                  <div className="flex items-center space-x-2">
                    {authStatus.has_github && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsOpen(false);
                          setGithubSetupOpen(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 font-medium"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        <span>Manage Labels</span>
                      </button>
                    )}
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=WidKanban%20Desktop%20Widget"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 font-medium"
                    >
                      <span>Create Token</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Google Tasks OAuth Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Google Tasks OAuth Token</span>
                  </div>
                  {authStatus.has_google ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <Check className="h-2.5 w-2.5" />
                        <span>Connected</span>
                      </span>
                      {authStatus.google_from_env && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80" title="Token loaded from .env environment variable">
                          .env (Dev Mode)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleFetchGoogleTasks}
                        disabled={isFetchingGoogle}
                        title="Sync Google Tasks"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFetchingGoogle ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect('google')}
                        title="Disconnect Google Tasks"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300">
                      Not Configured
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showGoogle ? 'text' : 'password'}
                    placeholder={authStatus.has_google ? '•••••••••••••••• (Leave blank to keep current)' : 'ya29.a0A...'}
                    value={googleToken}
                    onChange={(e) => setGoogleToken(e.target.value)}
                    className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogle(!showGoogle)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showGoogle ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Scope: <code>https://www.googleapis.com/auth/tasks</code></span>
                  <a
                    href="https://developers.google.com/oauthplayground"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 font-medium"
                  >
                    <span>Get OAuth token</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSaving || (!githubToken.trim() && !googleToken.trim())}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white'
                      : isSaving || (!githubToken.trim() && !googleToken.trim())
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-[0.98]'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Credentials</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: AUTO-SYNC & API HEALTH */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Auto-Sync & Polling Engine */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-750">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Background Auto-Sync
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Periodically query remote providers for new issues and tasks
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAutoSyncSettings({
                        enabled: !autoSyncSettings.enabled,
                        hasPrompted: true,
                      })
                    }
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      autoSyncSettings.enabled
                        ? 'bg-indigo-600 justify-end'
                        : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="h-4 w-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Polling Frequency Grid */}
                <div>
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Clock className="h-3 w-3 text-indigo-500" />
                    <span>Polling Frequency</span>
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
                        onClick={() => setAutoSyncSettings({ intervalMinutes: opt.value })}
                        className={`py-1.5 px-2.5 text-xs rounded-lg border text-left transition-all ${
                          autoSyncSettings.intervalMinutes === opt.value
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                            : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-200/80 dark:border-slate-750">
                  <input
                    type="checkbox"
                    checked={autoSyncSettings.notifyOnNewTasks}
                    onChange={(e) =>
                      setAutoSyncSettings({ notifyOnNewTasks: e.target.checked })
                    }
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 select-none">
                    <Bell className="h-3 w-3 text-indigo-500" />
                    <span>Show native desktop notification when new tasks are detected</span>
                  </span>
                </label>

                {/* Manual Refresh Now */}
                <div className="pt-1 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-750 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Status: {autoSyncSettings.enabled ? 'Active background polling' : 'Manual only'}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsManualSyncing(true);
                      await refreshTasks();
                      setIsManualSyncing(false);
                    }}
                    disabled={isManualSyncing}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`h-3 w-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>

              {/* API Quota & Token Health */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-200/80 dark:border-slate-750">
                  <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      API Quota & Token Health
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Real-time rate limit headers and token expiration metadata
                    </p>
                  </div>
                </div>

                {/* GitHub Quota Card */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Github className="h-3.5 w-3.5 text-slate-800 dark:text-slate-100" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        GitHub API Quota
                      </span>
                    </div>
                    {authStatus.has_github ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        {apiHealth.github.isRateLimited ? 'Throttled (0 Left)' : 'Active'}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400">
                        Disconnected
                      </span>
                    )}
                  </div>

                  {authStatus.has_github ? (
                    <div className="space-y-1.5 text-[11px]">
                      {/* Visual Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pb-1">
                          <span>Hourly Request Quota</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            {apiHealth.github.rateLimitRemaining ?? 5000} /{' '}
                            {apiHealth.github.rateLimitLimit ?? 5000}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-750 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              apiHealth.github.isRateLimited
                                ? 'bg-rose-500'
                                : (apiHealth.github.rateLimitRemaining ?? 5000) /
                                    (apiHealth.github.rateLimitLimit ?? 5000) <
                                  0.2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  2,
                                  Math.round(
                                    ((apiHealth.github.rateLimitRemaining ?? 5000) /
                                      (apiHealth.github.rateLimitLimit ?? 5000)) *
                                      100
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Reset Timestamp */}
                      {apiHealth.github.rateLimitReset && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                          <span>Quota Reset</span>
                          <span>
                            in{' '}
                            {Math.max(
                              0,
                              Math.round(
                                (apiHealth.github.rateLimitReset - Date.now() / 1000) / 60
                              )
                            )}{' '}
                            mins (
                            {new Date(
                              apiHealth.github.rateLimitReset * 1000
                            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            )
                          </span>
                        </div>
                      )}

                      {/* Token Expiration Alert */}
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Token Expiration:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {apiHealth.github.tokenExpiresAt
                            ? (() => {
                                try {
                                  const d = new Date(apiHealth.github.tokenExpiresAt);
                                  if (isNaN(d.getTime())) return apiHealth.github.tokenExpiresAt;
                                  const days = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return `${d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} (${days > 0 ? `in ${days} days` : 'expired'})`;
                                } catch {
                                  return apiHealth.github.tokenExpiresAt;
                                }
                              })()
                            : authStatus.has_github && !apiHealth.github.lastChecked
                            ? 'Checking status...'
                            : 'No expiration set'}
                        </span>
                      </div>

                      {Boolean(
                        apiHealth.github.isExpiringSoon ||
                          (apiHealth.github.tokenExpiresAt &&
                            (() => {
                              const d = new Date(apiHealth.github.tokenExpiresAt).getTime();
                              return !isNaN(d) && d - Date.now() < 7 * 24 * 60 * 60 * 1000 && d > Date.now();
                            })())
                      ) && (
                        <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>PAT expires within 7 days. Generate a new token to prevent interruption.</span>
                        </div>
                      )}

                      <div className="pt-1 text-right">
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>Manage Personal Access Tokens</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Connect your GitHub Personal Access Token in Integrations to view quota details.
                    </p>
                  )}
                </div>

                {/* Google Tasks Card */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        Google Tasks API & OAuth
                      </span>
                    </div>
                    {authStatus.has_google ? (
                      apiHealth.google.errorMessage || apiHealth.google.tokenExpiresAt === 'Expired' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                          Token Expired
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          Active
                        </span>
                      )
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400">
                        Disconnected
                      </span>
                    )}
                  </div>

                  {authStatus.has_google ? (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pb-0.5">
                        <span>Daily API Quota</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                          50,000 / day (Free Tier)
                        </span>
                      </div>

                      {/* Google Token Expiration */}
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Token Expiration:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {apiHealth.google.tokenExpiresAt === 'Expired'
                            ? 'Expired (1h limit)'
                            : apiHealth.google.tokenExpiresAt
                            ? (() => {
                                try {
                                  const d = new Date(apiHealth.google.tokenExpiresAt);
                                  if (isNaN(d.getTime())) return apiHealth.google.tokenExpiresAt;
                                  const diffMins = Math.round((d.getTime() - Date.now()) / (1000 * 60));
                                  if (diffMins <= 0) return 'Expired (1h limit)';
                                  return `Expires in ${diffMins}m (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                                } catch {
                                  return apiHealth.google.tokenExpiresAt;
                                }
                              })()
                            : authStatus.has_google && !apiHealth.google.lastChecked
                            ? 'Checking status...'
                            : 'Active (OAuth token)'}
                        </span>
                      </div>

                      {(apiHealth.google.tokenExpiresAt === 'Expired' ||
                        apiHealth.google.isExpiringSoon ||
                        Boolean(apiHealth.google.errorMessage)) && (
                        <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>
                            Google access tokens expire after 60 minutes. Re-authenticate or update your token in Integrations.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Connect your Google Tasks account in Integrations to sync your lists and tasks.
                    </p>
                  )}
                </div>

                {/* Rate-Limit Backoff Notice */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-100/60 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-750">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Smart Rate-Limit Back-Off: Polling automatically pauses whenever GitHub hourly
                    quota is exhausted, resuming once the reset window arrives.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: APPEARANCE */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              
              {/* Theme Mode Selector */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Theme Mode</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-medium">{customization.theme} mode</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCustomization({ theme: mode })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        customization.theme === mode
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-500 ring-2 ring-indigo-500/40 shadow-xs font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {mode === 'system' && <Monitor className="h-4 w-4 mb-1 text-slate-600 dark:text-slate-300" />}
                      {mode === 'light' && <Sun className="h-4 w-4 mb-1 text-amber-500" />}
                      {mode === 'dark' && <Moon className="h-4 w-4 mb-1 text-indigo-400" />}
                      <span className="capitalize text-[11px]">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Roundness ("More Not Round" / Sharp vs Rounded) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Square className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Corner Roundness</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-750 font-bold text-slate-800 dark:text-slate-100">
                    {customization.cornerRadius}px
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {cornerPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setCustomization({ cornerRadius: preset.value })}
                      className={`px-2 py-1.5 text-[11px] rounded-lg border font-medium text-center transition-all ${
                        customization.cornerRadius === preset.value
                          ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:text-white dark:border-indigo-500 shadow-xs font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Fine-tune Slider */}
                <div className="pt-1">
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="1"
                    value={customization.cornerRadius}
                    onChange={(e) => setCustomization({ cornerRadius: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>0px (Sharp edges)</span>
                    <span>16px (Default)</span>
                    <span>32px (Pill round)</span>
                  </div>
                </div>

                {/* Mini Card Preview */}
                <div 
                  style={{ borderRadius: `${customization.cornerRadius}px` }}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between text-xs transition-all"
                >
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">Live Corner Preview</span>
                  <span 
                    style={{ borderRadius: `${Math.max(0, Math.round(customization.cornerRadius * 0.5))}px` }}
                    className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border dark:border-indigo-800 font-bold"
                  >
                    Card Badge
                  </span>
                </div>
              </div>

              {/* Font Family Selector */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Font Family</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Applies across board</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {fontOptions.map((f) => {
                    const isSelected = customization.fontFamily === f.id;
                    const previewFontClass =
                      f.id === 'unifont'
                        ? 'font-unifont'
                        : f.id === 'mono'
                        ? 'font-mono'
                        : f.id === 'system'
                        ? 'font-system'
                        : 'font-sans';

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCustomization({ fontFamily: f.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-500 ring-2 ring-indigo-500/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`text-xs font-bold ${previewFontClass}`}>
                          {f.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {f.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: WINDOW & LAYOUT */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'window' && (
            <div className="space-y-4">
              
              {/* Window Placement & Resizing Behavior Info */}
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Automatic Size & Placement Memory</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900/90 dark:text-indigo-300/90">
                  WidKanban automatically saves your window position and custom size when moved or resized.
                  Whenever <strong>unpinned</strong> (pin icon off), freeform resizing is active by dragging any window edge.
                </p>
                <div className="pt-1 flex items-center space-x-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${isPinned ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'}`}>
                    Current: {isPinned ? 'Pinned (Resizing Locked)' : 'Unpinned (Resizing Allowed)'}
                  </span>
                </div>
              </div>

              {/* Quick Window Size Presets */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Quick Size Presets</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWindowSizePreset('compact')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Compact</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">380 × 680</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWindowSizePreset('wide')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Wide Board</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">850 × 600</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWindowSizePreset('expanded')}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Expanded</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">1100 × 720</div>
                  </button>
                </div>
              </div>

              {/* Reset Geometry Action */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Reset Window Position</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Center window and restore 380 × 680</div>
                </div>

                <button
                  type="button"
                  onClick={handleResetWindow}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
                >
                  <RotateCcw className={`h-3 w-3 ${resetWindowDone ? 'text-emerald-500 dark:text-emerald-400' : ''}`} />
                  <span>{resetWindowDone ? 'Centered!' : 'Reset'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 4: ADVANCED */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              
              {/* Column Header Height Slider */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Column Header Height</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-750 font-bold text-slate-800 dark:text-slate-100">
                    {customization.columnHeaderHeight}px
                  </span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="56"
                  step="2"
                  value={customization.columnHeaderHeight}
                  onChange={(e) => setCustomization({ columnHeaderHeight: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>24px (Compact)</span>
                  <span>36px (Default)</span>
                  <span>56px (Large banner)</span>
                </div>
              </div>

              {/* Column Header Font Size */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Column Header Font Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['xs', 'sm', 'base'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setCustomization({ columnHeaderFontSize: sz })}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        customization.columnHeaderFontSize === sz
                          ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:text-white dark:border-indigo-500 shadow-xs font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sz === 'xs' ? 'Small (12px)' : sz === 'sm' ? 'Medium (14px)' : 'Large (16px)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Minimum Width Slider */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Column Minimum Width</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-750 font-bold text-slate-800 dark:text-slate-100">
                    {customization.columnMinWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="400"
                  step="10"
                  value={customization.columnMinWidth}
                  onChange={(e) => setCustomization({ columnMinWidth: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>200px (Slim)</span>
                  <span>260px (Default)</span>
                  <span>400px (Wide cards)</span>
                </div>
              </div>

              {/* Card Density */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Card Padding Density</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'normal', 'relaxed'] as CardDensity[]).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => setCustomization({ cardDensity: density })}
                      className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                        customization.cardDensity === density
                          ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:text-white dark:border-indigo-500 shadow-xs font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
