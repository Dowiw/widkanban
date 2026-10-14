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
  RefreshCw
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    setSettingsOpen, 
    authStatus, 
    saveCredentials, 
    clearCredentials,
    fetchGoogleTasks,
    setCompletedOnboarding 
  } = useTaskStore();

  const [githubToken, setGithubToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);

  if (!isSettingsOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
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
      setSettingsOpen(false);
    }, 900);
  };

  const handleDisconnect = async (provider: 'github' | 'google') => {
    await clearCredentials(provider);
  };

  const handleFetchGoogleTasks = async () => {
    setIsFetchingGoogle(true);
    await fetchGoogleTasks();
    setIsFetchingGoogle(false);
  };

  const handleClose = () => {
    setCompletedOnboarding(true);
    setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 space-y-4 text-slate-800">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                API Integrations
              </h3>
              <p className="text-[11px] text-slate-500">
                Configure GitHub & Google API access
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 p-2 text-[11px] text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Credentials are saved strictly in your local native OS storage and never transmitted to third-party servers.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          
          {/* GitHub PAT Section */}
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Github className="h-3.5 w-3.5 text-slate-700" />
                <span className="font-semibold text-slate-800">GitHub Personal Access Token</span>
              </div>
              {authStatus.has_github ? (
                <div className="flex items-center space-x-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Connected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDisconnect('github')}
                    title="Disconnect GitHub"
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
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
                className="w-full rounded-lg bg-white border border-slate-200 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowGithub(!showGithub)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                {showGithub ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Scope needed: <code>repo</code> or <code>read:user</code></span>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center space-x-0.5"
              >
                <span>Generate PAT</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Google Tasks OAuth Access Token Section */}
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800">Google Tasks OAuth Token</span>
              </div>
              {authStatus.has_google ? (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleFetchGoogleTasks}
                    disabled={isFetchingGoogle}
                    title="Sync Google Tasks now"
                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingGoogle ? 'animate-spin' : ''}`} />
                  </button>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                    Connected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDisconnect('google')}
                    title="Disconnect Google Tasks"
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
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
                className="w-full rounded-lg bg-white border border-slate-200 py-1.5 pl-2.5 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowGoogle(!showGoogle)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                {showGoogle ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Scope: <code>https://www.googleapis.com/auth/tasks</code></span>
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center space-x-0.5"
              >
                <span>Get OAuth token</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              Skip for now
            </button>

            <button
              type="submit"
              disabled={isSaving || (!githubToken.trim() && !googleToken.trim())}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : isSaving || (!githubToken.trim() && !googleToken.trim())
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]'
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
      </div>
    </div>
  );
};
