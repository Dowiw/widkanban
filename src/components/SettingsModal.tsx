import React, { useState } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { FontFamilyOption, CardDensity, ThemeMode } from '../types/task';

type SettingsTab = 'integrations' | 'appearance' | 'window' | 'advanced';

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
    fetchBlackboardTasks,
    setCompletedOnboarding,
    customization,
    setCustomization,
    isPinned,
    setWindowSizePreset,
    resetWindowPositionAndSize,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [githubToken, setGithubToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [blackboardDomain, setBlackboardDomain] = useState(authStatus.blackboard_domain || '');
  const [blackboardToken, setBlackboardToken] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [showBlackboard, setShowBlackboard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [isFetchingBlackboard, setIsFetchingBlackboard] = useState(false);
  const [resetWindowDone, setResetWindowDone] = useState(false);

  if (!isSettingsOpen) return null;

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    await saveCredentials({
      githubToken: githubToken.trim() || undefined,
      googleToken: googleToken.trim() || undefined,
      blackboardDomain: blackboardDomain.trim() || undefined,
      blackboardToken: blackboardToken.trim() || undefined,
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setGithubToken('');
    setGoogleToken('');
    setBlackboardToken('');
    setCompletedOnboarding(true);

    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  const handleDisconnect = async (provider: 'github' | 'google' | 'blackboard') => {
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

  const handleFetchBlackboardTasks = async () => {
    setIsFetchingBlackboard(true);
    await fetchBlackboardTasks();
    setIsFetchingBlackboard(false);
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

              {/* Blackboard Learn LMS Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Blackboard Learn LMS</span>
                  </div>
                  {authStatus.has_blackboard ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <Check className="h-2.5 w-2.5" />
                        <span>Connected</span>
                      </span>
                      {authStatus.blackboard_domain && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 max-w-[120px] truncate">
                          {authStatus.blackboard_domain}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleFetchBlackboardTasks}
                        disabled={isFetchingBlackboard}
                        title="Sync Blackboard Assignments"
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFetchingBlackboard ? 'animate-spin text-amber-600 dark:text-amber-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect('blackboard')}
                        title="Disconnect Blackboard"
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

                {/* Institution Domain */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Institution Domain
                  </label>
                  <input
                    type="text"
                    placeholder={authStatus.blackboard_domain || 'blackboard.university.edu'}
                    value={blackboardDomain}
                    onChange={(e) => setBlackboardDomain(e.target.value)}
                    className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 px-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Personal Access Token */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Access Token / User Bearer Token
                  </label>
                  <div className="relative">
                    <input
                      type={showBlackboard ? 'text' : 'password'}
                      placeholder={authStatus.has_blackboard ? '•••••••••••••••• (Leave blank to keep current)' : 'Token from institution or Learn REST API'}
                      value={blackboardToken}
                      onChange={(e) => setBlackboardToken(e.target.value)}
                      className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBlackboard(!showBlackboard)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showBlackboard ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Syncs calendar deadlines and course grade items.</span>
                  <a
                    href="https://docs.anthology.com/rest-apis/learn/getting-started"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-0.5 font-medium"
                  >
                    <span>API Docs</span>
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
                  disabled={isSaving || (!githubToken.trim() && !googleToken.trim() && !blackboardToken.trim() && !blackboardDomain.trim())}
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white'
                      : isSaving || (!githubToken.trim() && !googleToken.trim() && !blackboardToken.trim() && !blackboardDomain.trim())
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
          {/* TAB 2: APPEARANCE */}
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
