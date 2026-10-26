import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { invoke } from '@tauri-apps/api/core';
import { 
  Pin, 
  PinOff,
  RotateCw, 
  Plus, 
  Search, 
  Github, 
  CheckSquare, 
  Minus,
  X,
  Settings,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Ellipsis,
  Users
} from 'lucide-react';
import { LocallyDeletedDropdown } from './LocallyDeletedDropdown';

export const Header: React.FC = () => {
  const { 
    filterSource, 
    setFilterSource, 
    searchQuery, 
    setSearchQuery, 
    isPinned, 
    togglePin, 
    setAddTaskOpen, 
    setSettingsOpen,
    authStatus,
    refreshTasks,
    tasks,
    locallyDeletedTasks,
    isTrashDropdownOpen,
    toggleTrashDropdown,
    hasSeenLocallyDeletedTip,
    dismissLocallyDeletedTip,
    customization,
    toggleTheme,
    apiHealth,
    syncBanner,
    setSyncBanner,
  } = useTaskStore();

  const [showSearch, setShowSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [isToolsPinned, setIsToolsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('widkanban_tools_pinned');
        return saved ? JSON.parse(saved) : false;
      } catch {
        return false;
      }
    }
    return false;
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const extraToolsButtonRef = useRef<HTMLDivElement>(null);
  const extraToolsRowRef = useRef<HTMLDivElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    if (!showSearch) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch]);

  // Autofocus search input when opened
  useEffect(() => {
    if (showSearch) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [showSearch]);

  // Close extra tools on outside click if not pinned
  useEffect(() => {
    if (!showExtraTools || isToolsPinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        extraToolsButtonRef.current?.contains(target) ||
        extraToolsRowRef.current?.contains(target)
      ) {
        return;
      }
      setShowExtraTools(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExtraTools, isToolsPinned]);

  // Auto-dismiss syncBanner after 6 seconds
  useEffect(() => {
    if (!syncBanner) return;
    const timer = setTimeout(() => setSyncBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [syncBanner, setSyncBanner]);

  // Compute overall API health state
  let healthColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  let healthDot = 'bg-emerald-500';
  let healthStatusText = 'API Quota Healthy';

  const gh = apiHealth?.github;
  const gg = apiHealth?.google;

  const isRateLimited = gh?.isRateLimited;
  const isExpiredOrError = gh?.errorMessage || gg?.errorMessage;
  const isExpiringSoon = gh?.isExpiringSoon || gg?.isExpiringSoon;

  const ghRemaining = gh?.rateLimitRemaining;
  const ghLimit = gh?.rateLimitLimit;
  const isLowQuota =
    ghRemaining !== undefined && ghLimit !== undefined && ghLimit > 0 && ghRemaining / ghLimit < 0.2;

  const isDisconnectedOrError =
    (authStatus.has_github && gh?.lastChecked && !gh?.connected) ||
    (authStatus.has_google && gg?.lastChecked && !gg?.connected) ||
    Boolean(isExpiredOrError);

  if (isRateLimited || isDisconnectedOrError) {
    healthColor = 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    healthDot = 'bg-rose-500 animate-pulse';
    healthStatusText = isRateLimited
      ? 'GitHub Rate Limit Reached (Backing off)'
      : gh?.errorMessage
      ? `GitHub: ${gh.errorMessage}`
      : gg?.errorMessage
      ? `Google: ${gg.errorMessage}`
      : 'Account Disconnected / Invalid Token';
  } else if (isLowQuota || isExpiringSoon) {
    healthColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    healthDot = 'bg-amber-500';
    healthStatusText = isExpiringSoon
      ? 'Token Expiring Soon (Within 7 days)'
      : `Low Quota: ${ghRemaining} / ${ghLimit} requests remaining`;
  } else if (!authStatus.has_github && !authStatus.has_google && !authStatus.has_microsoft) {
    healthColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    healthDot = 'bg-slate-400';
    healthStatusText = 'No Accounts Connected';
  }

  const ghCount = tasks.filter((t) => t.source === 'github').length;
  const gtCount = tasks.filter((t) => t.source === 'google_tasks').length;
  const msCount = tasks.filter((t) => t.source === 'microsoft_teams').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTasks();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTogglePin = () => {
    togglePin();
  };

  const handleMinimizeWindow = async () => {
    try {
      await invoke('minimize_window');
    } catch {
      console.log('Running in browser preview mode; minimize ignored.');
    }
  };

  const handleCloseApp = async () => {
    try {
      await invoke('close_app');
    } catch {
      console.log('Running in browser preview mode; close ignored.');
    }
  };

  const dragProps = isPinned ? {} : { 'data-tauri-drag-region': true };

  return (
    <header className="widget-drag-bar flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none transition-colors duration-150 relative">
      {/* 1. Top Slim Window Drag Strip & Controls */}
      <div 
        {...dragProps}
        className={`h-7 px-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 ${
          isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        {/* Left: Brand Icon & App Title */}
        <div {...dragProps} className="flex items-center space-x-1.5 min-w-0">
          <img 
            src="/logo.png" 
            alt="WidKanban" 
            className="h-3.5 w-3.5 rounded object-contain pointer-events-none" 
          />
          <span className="text-[11px] font-semibold tracking-wider text-slate-700 dark:text-slate-300 truncate">
            WidKanban
          </span>
        </div>

        {/* Right: Window Controls pinned flush to the very top corner */}
        <div className="flex items-center -mr-2.5 h-full no-drag">
          <button
            type="button"
            onClick={handleMinimizeWindow}
            title="Minimize to System Tray"
            className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleCloseApp}
            title="Quit Application"
            className="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 2. Main Toolbar Row */}
      <div className="px-2.5 py-1.5 flex items-center justify-between gap-1.5 relative">
        {/* Left: Filter Tabs with Task Counts */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/90 dark:border-slate-750 shrink-0">
          <button
            type="button"
            onClick={() => setFilterSource('all')}
            className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
              filterSource === 'all'
                ? 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-2xs font-semibold'
                : 'font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilterSource('github')}
            className={`px-1.5 py-0.5 rounded-md font-medium text-[11px] flex items-center space-x-1 transition-all ${
              filterSource === 'github'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Github className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>GitHub</span>
            <span className="text-[10px] opacity-75">({ghCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterSource('google_tasks')}
            className={`px-1.5 py-0.5 rounded-md font-medium text-[11px] flex items-center space-x-1 transition-all ${
              filterSource === 'google_tasks'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
            <span>Google</span>
            <span className="text-[10px] opacity-75">({gtCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterSource('microsoft_teams')}
            className={`px-1.5 py-0.5 rounded-md font-medium text-[11px] flex items-center space-x-1 transition-all ${
              filterSource === 'microsoft_teams'
                ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3 w-3 text-violet-500 dark:text-violet-400 shrink-0" />
            <span>Teams</span>
            <span className="text-[10px] font-mono opacity-75">({msCount})</span>
          </button>
        </div>

        {/* Right: Primary Controls (Search, Add +, Settings, More ...) */}
        <div className="flex items-center space-x-1 no-drag shrink-0">
          {/* Search Toggle & Floating Dropdown */}
          <div ref={searchContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              title={searchQuery ? `Searching: "${searchQuery}" (Click to toggle)` : "Search tasks"}
              className={`p-1.5 rounded-lg transition-colors relative ${
                showSearch || searchQuery
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              {searchQuery && !showSearch && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Floating Search Popover */}
            {showSearch && (
              <div 
                className="absolute right-0 top-9 z-50 w-64 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1.5 border border-slate-200 dark:border-slate-750 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-colors">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search issues & tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowSearch(false);
                    }}
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1.5 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-[9px] border border-slate-200 dark:border-slate-700">Esc</kbd> to close</span>
                  {searchQuery ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Filter active</span>
                  ) : (
                    <span>Filters live</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            title="Add Task"
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Settings & Customization"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Settings className="h-3.5 w-3.5" />
            {(authStatus.has_github || authStatus.has_google || authStatus.has_microsoft) && (
              <span
                className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                  isDisconnectedOrError
                    ? 'bg-rose-500 animate-pulse'
                    : isExpiringSoon
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            )}
          </button>

          {/* More Actions (...) Button */}
          <div ref={extraToolsButtonRef} className="relative">
            <button
              type="button"
              onClick={() => setShowExtraTools(!showExtraTools)}
              title={showExtraTools || isToolsPinned ? "Collapse extra tools" : "More actions (Sync, Theme, Pin, Trash)"}
              className={`p-1.5 rounded-lg transition-colors relative ${
                showExtraTools || isToolsPinned
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Ellipsis className="h-3.5 w-3.5" />
              {(isPinned || locallyDeletedTasks.length > 0) && !showExtraTools && !isToolsPinned && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-slate-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Secondary Tools Row: Toggled by ... or Pinned open */}
      {(showExtraTools || isToolsPinned) && (
        <div 
          ref={extraToolsRowRef}
          className="px-2.5 pb-2 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/60 text-xs animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center space-x-1 no-drag">
            {/* Refresh Sync */}
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh Sync"
              className={`px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1 text-[11px] font-medium ${
                isRefreshing ? 'text-indigo-600 dark:text-indigo-400' : ''
              }`}
            >
              <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            {/* API Health & Quota Pill */}
            {(authStatus.has_github || authStatus.has_google || authStatus.has_microsoft) && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title={`${healthStatusText}\n• GitHub: ${
                  ghRemaining !== undefined
                    ? `${ghRemaining} / ${ghLimit} requests remaining`
                    : authStatus.has_github
                    ? 'Connected'
                    : 'Not configured'
                }${
                  gh?.rateLimitReset
                    ? ` (Resets in ${Math.max(
                        0,
                        Math.round((gh.rateLimitReset - Date.now() / 1000) / 60)
                      )}m)`
                    : ''
                }\n• Google Tasks: ${
                  authStatus.has_google
                    ? gg?.connected
                      ? 'Active'
                      : 'Error'
                    : 'Not configured'
                }\nClick to view API Health in Settings.`}
                className={`px-1.5 py-0.5 rounded-md border flex items-center space-x-1 text-[10px] font-medium transition-colors ${healthColor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${healthDot}`} />
                <span>
                  {isRateLimited
                    ? 'Throttled'
                    : ghRemaining !== undefined
                    ? `${ghRemaining}`
                    : 'API OK'}
                </span>
              </button>
            )}

            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Current theme: ${customization.theme} (Click to switch)`}
              className="px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1 text-[11px] font-medium"
            >
              {customization.theme === 'light' ? (
                <Sun className="h-3 w-3 text-amber-500" />
              ) : customization.theme === 'dark' ? (
                <Moon className="h-3 w-3 text-indigo-400" />
              ) : (
                <Monitor className="h-3 w-3 text-slate-400 dark:text-slate-300" />
              )}
              <span className="capitalize">{customization.theme}</span>
            </button>

            {/* Pin Window */}
            <button
              type="button"
              onClick={handleTogglePin}
              title={
                isPinned
                  ? `Pinned to ${
                      customization.pinMode === 'desktop-layer'
                        ? 'Desktop Layer'
                        : 'Always on Top'
                    } (Movement & Resizing Locked)`
                  : 'Unpinned (Movement & Resizing Enabled)'
              }
              className={`px-2 py-1 rounded-md transition-colors flex items-center space-x-1 text-[11px] font-medium ${
                isPinned 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Pin className={`h-3 w-3 ${isPinned ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
              <span>
                {isPinned
                  ? customization.pinMode === 'desktop-layer'
                    ? 'Desktop'
                    : 'Pinned'
                  : 'Pin'}
              </span>
            </button>

            {/* Hidden / Deleted Tasks */}
            <div className="relative">
              <button
                data-trash-trigger="true"
                type="button"
                onClick={toggleTrashDropdown}
                title={`Hidden / Deleted Tasks (${locallyDeletedTasks.length})`}
                className={`px-2 py-1 rounded-md transition-colors flex items-center space-x-1 text-[11px] font-medium relative ${
                  isTrashDropdownOpen
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Trash2 className="h-3 w-3" />
                <span>Trash</span>
                {locallyDeletedTasks.length > 0 && (
                  <span className="ml-0.5 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {locallyDeletedTasks.length}
                  </span>
                )}
              </button>
              <LocallyDeletedDropdown />
            </div>
          </div>

          {/* Right: Pin Toolbar Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isToolsPinned;
              setIsToolsPinned(next);
              localStorage.setItem('widkanban_tools_pinned', JSON.stringify(next));
              if (!next) setShowExtraTools(false);
            }}
            title={isToolsPinned ? "Unpin toolbar (auto-collapse into ... menu)" : "Keep extra tools always open"}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center space-x-1 transition-colors no-drag ${
              isToolsPinned
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 font-medium'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {isToolsPinned ? (
              <>
                <Pin className="h-2.5 w-2.5 fill-indigo-500" />
                <span>Always open</span>
              </>
            ) : (
              <>
                <PinOff className="h-2.5 w-2.5 opacity-70" />
                <span>Pin open</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 4. One-time resync tip banner */}
      {locallyDeletedTasks.length > 0 && !hasSeenLocallyDeletedTip && (
        <div className="mx-2.5 my-1.5 flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center space-x-1.5 min-w-0 pr-1">
            <Trash2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              {locallyDeletedTasks.length} locally hidden task(s). Click trash icon in extra tools to view/restore.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissLocallyDeletedTip}
            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-800/60 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* 5. In-App Sync Banner */}
      {syncBanner && (
        <div className="mx-2.5 my-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <span className="flex items-center gap-1.5 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
            <span className="truncate">{syncBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setSyncBanner(null)}
            className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 p-0.5 rounded transition-colors ml-2 shrink-0"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </header>
  );
};
