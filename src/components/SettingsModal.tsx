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
  Users,
  Pin,
  Power,
  Layers,
  Lock,
  Unlock,
  Clock,
  Bell,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { FontFamilyOption, CardDensity, ThemeMode, PinMode, CredentialInspectionReport } from '../types/task';
import { PermissionsReviewModal } from './PermissionsReviewModal';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

type SettingsTab = 'integrations' | 'sync' | 'appearance' | 'window' | 'advanced';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    setGithubSetupOpen,
    authStatus,
    inspectCredentials,
    saveCredentials,
    clearCredentials,
    startGoogleOAuthFlow,
    fetchGoogleTasks,
    fetchGithubTasks,
    fetchMicrosoftTasks,
    setCompletedOnboarding,
    customization,
    setCustomization,
    isPinned,
    setPinMode,
    setWindowSizePreset,
    resetWindowPositionAndSize,
    startupSettings,
    enableAutostart,
    disableAutostart,
    checkAutostartStatus,
    setStartupSettings,
    autoSyncSettings,
    setAutoSyncSettings,
    apiHealth,
    fetchApiHealth,
    refreshTasks,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [githubToken, setGithubToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [microsoftToken, setMicrosoftToken] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [showMicrosoft, setShowMicrosoft] = useState(false);
  const [showGoogleClientSecret, setShowGoogleClientSecret] = useState(false);
  const [showManualGoogle, setShowManualGoogle] = useState(false);
  const [showGoogleSetupGuide, setShowGoogleSetupGuide] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [googleOAuthError, setGoogleOAuthError] = useState<string | null>(null);
  const [googleOAuthSuccess, setGoogleOAuthSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inspectionReport, setInspectionReport] = useState<CredentialInspectionReport | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isValidatingTokens, setIsValidatingTokens] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [isFetchingMicrosoft, setIsFetchingMicrosoft] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [resetWindowDone, setResetWindowDone] = useState(false);
  const [isTogglingAutostart, setIsTogglingAutostart] = useState(false);

  useEffect(() => {
    fetchApiHealth();
  }, [activeTab, fetchApiHealth]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    checkAutostartStatus();
    if (activeTab === 'window') {
      const interval = setInterval(() => {
        checkAutostartStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSettingsOpen, activeTab, checkAutostartStatus]);

  if (!isSettingsOpen) return null;

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const hasCandidateTokens = Boolean(
      githubToken.trim() || googleToken.trim() || microsoftToken.trim()
    );

    if (!hasCandidateTokens) {
      setIsSaving(true);
      await saveCredentials({
        googleClientId: googleClientId.trim() || undefined,
        googleClientSecret: googleClientSecret.trim() || undefined,
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
      return;
    }

    setIsValidatingTokens(true);

    try {
      const report = await inspectCredentials({
        githubToken: githubToken.trim() || undefined,
        googleToken: googleToken.trim() || undefined,
        microsoftToken: microsoftToken.trim() || undefined,
      });

      setIsValidatingTokens(false);

      if (report && report.providers && report.providers.length > 0) {
        setInspectionReport(report);
        setIsReviewModalOpen(true);
      } else {
        await handleConfirmSave();
      }
    } catch (err) {
      setIsValidatingTokens(false);
      setValidationError(
        typeof err === 'string'
          ? err
          : 'Failed to inspect token permissions. Please check your network and tokens.'
      );
    }
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    await saveCredentials({
      githubToken: githubToken.trim() || undefined,
      googleToken: googleToken.trim() || undefined,
      googleClientId: googleClientId.trim() || undefined,
      googleClientSecret: googleClientSecret.trim() || undefined,
      microsoftToken: microsoftToken.trim() || undefined,
    });

    setIsSaving(false);
    setIsReviewModalOpen(false);
    setInspectionReport(null);
    setSaveSuccess(true);
    setGithubToken('');
    setGoogleToken('');
    setMicrosoftToken('');
    setCompletedOnboarding(true);

    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setGoogleOAuthError(null);
    setGoogleOAuthSuccess(false);

    const res = await startGoogleOAuthFlow({
      clientId: googleClientId.trim() || undefined,
      clientSecret: googleClientSecret.trim() || undefined,
    });

    setIsSigningInGoogle(false);
    if (res.success) {
      setGoogleOAuthSuccess(true);
      setCompletedOnboarding(true);
      setTimeout(() => setGoogleOAuthSuccess(false), 2500);
    } else {
      setGoogleOAuthError(res.error || 'Google sign-in was cancelled or failed.');
    }
  };

  const handleDisconnect = async (provider: 'github' | 'google' | 'microsoft') => {
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

  const handleFetchMicrosoftTasks = async () => {
    setIsFetchingMicrosoft(true);
    await fetchMicrosoftTasks();
    setIsFetchingMicrosoft(false);
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
                      {(!apiHealth.github.connected || Boolean(apiHealth.github.errorMessage)) ? (
                        <span
                          className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80"
                          title={apiHealth.github.errorMessage || 'GitHub connection failed'}
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          <span>Disconnected</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                          <Check className="h-2.5 w-2.5" />
                          <span>Connected</span>
                        </span>
                      )}
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
                  <span>Required scope: <code>repo, read:user</code></span>
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

                {authStatus.has_github && apiHealth.github.lastChecked && (!apiHealth.github.connected || Boolean(apiHealth.github.errorMessage)) && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-md px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <span>
                      {apiHealth.github.errorMessage || 'GitHub token rejected or revoked. Please enter a valid token.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Google Tasks Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                        Google Tasks
                      </span>
                    </div>
                  </div>
                  {authStatus.has_google ? (
                    <div className="flex items-center space-x-1.5">
                      {(!apiHealth.google.connected || Boolean(apiHealth.google.errorMessage)) ? (
                        <span
                          className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80"
                          title={apiHealth.google.errorMessage || 'Google connection error'}
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          <span>Disconnected</span>
                        </span>
                      ) : authStatus.google_has_refresh_token ? (
                        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                          <Check className="h-2.5 w-2.5" />
                          <span>Connected (Auto-Refresh)</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                          <span>Connected (1h Token)</span>
                        </span>
                      )}
                      {authStatus.google_from_env && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80" title="Token loaded from .env environment variable">
                          .env
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

                {/* Primary 1-Click "Sign in with Google" Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningInGoogle}
                    className={`w-full flex items-center justify-center space-x-2.5 py-2 px-3 rounded-lg border text-xs font-semibold shadow-xs transition-all ${
                      isSigningInGoogle
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-wait'
                        : authStatus.has_google && authStatus.google_has_refresh_token
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm active:scale-[0.99]'
                    }`}
                  >
                    {isSigningInGoogle ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        <span>Waiting for Google sign-in in browser...</span>
                      </>
                    ) : (
                      <>
                        <GoogleIcon className="h-4 w-4 shrink-0" />
                        <span>
                          {authStatus.has_google && authStatus.google_has_refresh_token
                            ? 'Re-authenticate with Google'
                            : 'Sign in with Google (Recommended)'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Browser Wait Notice */}
                  {isSigningInGoogle && (
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 p-2 rounded-lg border border-blue-200 dark:border-blue-800/80 flex items-start space-x-1.5 animate-pulse">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        A browser tab opened to the Google OAuth consent page. Choose your Google account and click Allow. WidKanban will automatically capture the response.
                      </span>
                    </div>
                  )}

                  {/* OAuth Success Alert */}
                  {googleOAuthSuccess && (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex items-center space-x-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Google Tasks connected successfully! Background auto-refresh is enabled.</span>
                    </div>
                  )}

                  {/* OAuth Error Alert */}
                  {googleOAuthError && (
                    <div className="text-[10px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 p-2 rounded-lg border border-rose-200 dark:border-rose-800/80 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-semibold">Authentication Error</span>
                      </div>
                      <p className="pl-5 text-rose-600 dark:text-rose-400">{googleOAuthError}</p>
                      {googleOAuthError.includes('redirect_uri_mismatch') && (
                        <p className="pl-5 text-[9px] text-slate-600 dark:text-slate-300">
                          Tip: Ensure your OAuth Client in Google Cloud is set to <strong>Desktop app</strong> (not Web application) so dynamic loopback ports are allowed.
                        </p>
                      )}
                    </div>
                  )}

                  {authStatus.has_google && apiHealth.google.lastChecked && (!apiHealth.google.connected || Boolean(apiHealth.google.errorMessage)) && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-md px-2.5 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>
                        {apiHealth.google.errorMessage || 'Google Tasks disconnected. Please re-authenticate.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Collapsible: Custom Client ID / Secret Settings */}
                <div className="pt-1 border-t border-slate-200/80 dark:border-slate-750">
                  <button
                    type="button"
                    onClick={() => setShowGoogleSetupGuide(!showGoogleSetupGuide)}
                    className="w-full flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors"
                  >
                    <span className="flex items-center space-x-1">
                      <HelpCircle className="h-3 w-3" />
                      <span>OAuth App Settings & Setup Guide</span>
                    </span>
                    {showGoogleSetupGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showGoogleSetupGuide && (
                    <div className="mt-2 space-y-2.5 text-[11px] p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Google OAuth Client ID (Desktop App)
                        </label>
                        <input
                          type="text"
                          placeholder="xxxx.apps.googleusercontent.com"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          className="w-full rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 py-1 px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Client Secret (Optional for Desktop)
                        </label>
                        <div className="relative">
                          <input
                            type={showGoogleClientSecret ? 'text' : 'password'}
                            placeholder="GOCSPX-..."
                            value={googleClientSecret}
                            onChange={(e) => setGoogleClientSecret(e.target.value)}
                            className="w-full rounded-md bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 py-1 pl-2 pr-7 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGoogleClientSecret(!showGoogleClientSecret)}
                            className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showGoogleClientSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Setup Instructions */}
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-[10px] space-y-1.5 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                          Step by Step Setup Instructions:
                        </span>
                        <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                          <li>
                            Open{' '}
                            <a
                              href="https://console.cloud.google.com/apis/credentials"
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 underline inline-flex items-center gap-0.5 font-medium"
                            >
                              <span>Google Cloud Console</span>
                              <ExternalLink className="h-2 w-2" />
                            </a>
                            {' '}and enable the <strong>Google Tasks API</strong>.
                          </li>
                          <li>
                            Create Credentials → <strong>OAuth client ID</strong>.
                          </li>
                          <li>
                            Under Application type, select <strong>Desktop app</strong> (this enables dynamic loopback port authentication without URI errors).
                          </li>
                          <li>
                            Paste the Client ID above, click <strong>Save Credentials</strong> below, and click <strong>Sign in with Google</strong>.
                          </li>
                        </ol>
                      </div>

                      {/* Dev Preview Callback Pages (Only rendered in Development mode) */}
                      {import.meta.env.DEV && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 font-mono font-medium">DEV</span>
                            <span>Preview OAuth:</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await invoke('open_oauth_preview', { isSuccess: true, errorMsg: null });
                                } catch {
                                  window.open('http://localhost:1420/oauth-verified.html', '_blank');
                                }
                              }}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                              title="Open Google Authentication Verified page in browser"
                            >
                              Verified
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await invoke('open_oauth_preview', { isSuccess: false, errorMsg: null });
                                } catch {
                                  window.open('http://localhost:1420/oauth-failed.html', '_blank');
                                }
                              }}
                              className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="Open Google Authentication Failed page in browser"
                            >
                              Failed
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsible: Manual Access Token Fallback */}
                <div className="pt-1 border-t border-slate-200/80 dark:border-slate-750">
                  <button
                    type="button"
                    onClick={() => setShowManualGoogle(!showManualGoogle)}
                    className="w-full flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors"
                  >
                    <span>Manual Access Token (Fallback)</span>
                    {showManualGoogle ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showManualGoogle && (
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <input
                          type={showGoogle ? 'text' : 'password'}
                          placeholder={authStatus.has_google ? '•••••••••••••••• (Leave blank to keep current)' : 'ya29.a0A...'}
                          value={googleToken}
                          onChange={(e) => setGoogleToken(e.target.value)}
                          className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-[10px]"
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
                        <span>Scope: <code>tasks</code></span>
                        <a
                          href="https://developers.google.com/oauthplayground"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 font-medium"
                        >
                          <span>Get OAuth token via Playground</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Microsoft 365 / Teams OAuth Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Microsoft 365 & Teams</span>
                  </div>
                  {authStatus.has_microsoft ? (
                    <div className="flex items-center space-x-1.5">
                      {authStatus.microsoft_from_env && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80" title="Token loaded from .env environment variable">
                          .env
                        </span>
                      )}
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <Check className="h-2.5 w-2.5" />
                        <span>Connected</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleFetchMicrosoftTasks}
                        disabled={isFetchingMicrosoft}
                        title="Sync Microsoft Tasks"
                        className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFetchingMicrosoft ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect('microsoft')}
                        title="Disconnect Microsoft 365"
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
                    type={showMicrosoft ? 'text' : 'password'}
                    placeholder={authStatus.has_microsoft ? '•••••••••••••••• (Leave blank to keep current)' : 'eyJ0eXAiOiJKV1Qi...'}
                    value={microsoftToken}
                    onChange={(e) => setMicrosoftToken(e.target.value)}
                    className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMicrosoft(!showMicrosoft)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showMicrosoft ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Scopes: <code>Tasks.ReadWrite</code> <code>EduAssignments.ReadBasic</code></span>
                  <div className="flex items-center space-x-2">
                    <a
                      href="https://github.com/Dowiw/widkanban/blob/main/docs/teams-setup.md"
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Setup Guide</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    <a
                      href="https://developer.microsoft.com/en-us/graph/graph-explorer"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 font-medium"
                    >
                      <span>Graph Explorer</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Validation Error Notice if any */}
              {validationError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

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
                  disabled={
                    isSaving ||
                    isValidatingTokens ||
                    (!githubToken.trim() &&
                      !googleToken.trim() &&
                      !googleClientId.trim() &&
                      !googleClientSecret.trim() &&
                      !microsoftToken.trim())
                  }
                  className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white'
                      : isSaving ||
                        isValidatingTokens ||
                        (!githubToken.trim() &&
                          !googleToken.trim() &&
                          !googleClientId.trim() &&
                          !googleClientSecret.trim() &&
                          !microsoftToken.trim())
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-[0.98]'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : isValidatingTokens ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Checking Permissions...</span>
                    </>
                  ) : isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
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
                      authStatus.google_has_refresh_token ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" />
                          <span>Active (Auto-Refresh)</span>
                        </span>
                      ) : apiHealth.google.errorMessage || apiHealth.google.tokenExpiresAt === 'Expired' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                          Token Expired
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Active (Manual Token)
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

                      {/* Google Token Expiration & Mode */}
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Sync Mode:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {authStatus.google_has_refresh_token
                            ? 'Auto-Refresh (Persistent)'
                            : 'Manual Access Token (1-hour lifespan)'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Current Access Token:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {apiHealth.google.tokenExpiresAt === 'Expired'
                            ? authStatus.google_has_refresh_token
                              ? 'Refreshed on next sync'
                              : 'Expired (1h limit)'
                            : apiHealth.google.tokenExpiresAt
                            ? (() => {
                                try {
                                  const d = new Date(apiHealth.google.tokenExpiresAt);
                                  if (isNaN(d.getTime())) return apiHealth.google.tokenExpiresAt;
                                  const diffMins = Math.round((d.getTime() - Date.now()) / (1000 * 60));
                                  if (diffMins <= 0) {
                                    return authStatus.google_has_refresh_token
                                      ? 'Refreshed on next sync'
                                      : 'Expired (1h limit)';
                                  }
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

                      {/* Token Warnings / Auto-refresh confirmation */}
                      {authStatus.google_has_refresh_token ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          <span>
                            Silent auto-refresh active. WidKanban renews access tokens automatically using your OAuth refresh token.
                          </span>
                        </div>
                      ) : (
                        (apiHealth.google.tokenExpiresAt === 'Expired' ||
                          apiHealth.google.isExpiringSoon ||
                          Boolean(apiHealth.google.errorMessage)) && (
                          <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>
                              Google access tokens expire after 60 minutes. Use "Sign in with Google" in Integrations for automatic background refresh.
                            </span>
                          </div>
                        )
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

              {/* Desktop Widget Layer & Pin Mode */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Pin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Desktop Pin & Layer Mode
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                      isPinned
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isPinned ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                    <span>{isPinned ? 'Movement & Resizing Locked' : 'Unlocked (Free Drag & Resize)'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {[
                    {
                      id: 'always-on-top' as PinMode,
                      title: 'Always on Top (Foreground)',
                      desc: 'Floats persistently in front of all other application windows.',
                      icon: Pin,
                    },
                    {
                      id: 'desktop-layer' as PinMode,
                      title: 'Pin to Desktop Layer (Always on Bottom)',
                      desc: 'Sits behind active windows on the wallpaper layer (ideal widget mode).',
                      icon: Layers,
                    },
                    {
                      id: 'normal' as PinMode,
                      title: 'Standard Window Mode',
                      desc: 'Standard OS window z-order and focus behavior.',
                      icon: Monitor,
                    },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = (customization.pinMode || 'always-on-top') === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPinMode(mode.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/70 dark:border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-semibold ${
                                isSelected
                                  ? 'text-indigo-900 dark:text-indigo-200'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {mode.title}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5">
                                <Check className="h-3 w-3" />
                                <span>Active</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {mode.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Startup & Behavior */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      System Startup & Launch
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      startupSettings.autostartEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {startupSettings.autostartEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* Launch on Startup Toggle */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="flex flex-col pr-3">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Launch WidKanban at System Startup
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Native OS startup registration (Windows Registry HKCU, macOS LaunchAgent, Linux XDG).
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={startupSettings.autostartEnabled}
                      disabled={isTogglingAutostart}
                      onChange={async (e) => {
                        setIsTogglingAutostart(true);
                        if (e.target.checked) {
                          await enableAutostart(startupSettings.startMinimized);
                        } else {
                          await disableAutostart();
                        }
                        setIsTogglingAutostart(false);
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 h-4 w-4 cursor-pointer"
                    />
                  </label>

                  {/* Start Minimized to Tray */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div className="flex flex-col pr-3">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Start Minimized to System Tray
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Launches silently in the background tray at startup without stealing focus.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={startupSettings.startMinimized}
                      onChange={async (e) => {
                        const nextVal = e.target.checked;
                        setStartupSettings({ startMinimized: nextVal });
                        if (startupSettings.autostartEnabled) {
                          await enableAutostart(nextVal);
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 h-4 w-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

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
                    Current: {isPinned ? 'Pinned (Movement & Resizing Locked)' : 'Unpinned (Resizing Allowed)'}
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

      {/* Permission Review Modal Layer */}
      <PermissionsReviewModal
        isOpen={isReviewModalOpen}
        report={inspectionReport}
        onConfirm={handleConfirmSave}
        onCancel={() => setIsReviewModalOpen(false)}
        isSaving={isSaving}
      />
    </div>
  );
};
