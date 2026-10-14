import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { invoke } from '@tauri-apps/api/core';
import { 
  Pin, 
  RotateCw, 
  Plus, 
  Search, 
  Filter, 
  Github, 
  CheckSquare, 
  Minus,
  X,
  Settings,
  Trash2,
  Sun,
  Moon,
  Monitor
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
  } = useTaskStore();

  const [showSearch, setShowSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ghCount = tasks.filter((t) => t.source === 'github').length;
  const gtCount = tasks.filter((t) => t.source === 'google_tasks').length;

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
    <header className="widget-drag-bar flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 select-none transition-colors duration-150">
      {/* Top Bar with Drag Area */}
      <div 
        {...dragProps}
        className={`flex items-center justify-between py-1 ${isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      >
        {/* Brand & Stats */}
        <div {...dragProps} className="flex items-center space-x-2.5">
          <img 
            src="/logo.png" 
            alt="WidKanban" 
            className="h-7 w-7 rounded-lg object-contain shadow-sm border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5" 
          />
          <div>
            <h1 className="font-unifont text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              WidKanban
            </h1>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center space-x-0.5">
                <Github className="h-2.5 w-2.5 text-emerald-500 dark:text-emerald-400" />
                <span>{ghCount}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-0.5">
                <CheckSquare className="h-2.5 w-2.5 text-blue-500 dark:text-blue-400" />
                <span>{gtCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center space-x-1 no-drag">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Toggle Search"
            className={`p-1.5 rounded-md transition-colors ${
              showSearch 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' 
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleRefresh}
            title="Refresh Sync"
            className={`p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors ${
              isRefreshing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Theme: ${customization.theme} (Click to switch)`}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {customization.theme === 'light' ? (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            ) : customization.theme === 'dark' ? (
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Monitor className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
            )}
          </button>

          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Always on top (Active - Resizing Locked)' : 'Always on top (Inactive - Resizing Enabled)'}
            className={`p-1.5 rounded-md transition-colors ${
              isPinned 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 dark:border dark:border-indigo-800/40' 
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings & Customization"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Settings className="h-3.5 w-3.5" />
            {(authStatus.has_github || authStatus.has_google) && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Hidden / Deleted Tasks Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={toggleTrashDropdown}
              title={`Hidden / Deleted Tasks (${locallyDeletedTasks.length})`}
              className={`p-1.5 rounded-md transition-colors relative ${
                isTrashDropdownOpen
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {locallyDeletedTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900">
                  {locallyDeletedTasks.length}
                </span>
              )}
            </button>
            <LocallyDeletedDropdown />
          </div>

          <button
            onClick={() => setAddTaskOpen(true)}
            title="Add Mock Task"
            className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all ml-0.5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Minimize / Hide to System Tray (-) */}
          <button
            onClick={handleMinimizeWindow}
            title="Minimize to System Tray"
            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800 transition-colors ml-1"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Close / Quit Application (X) */}
          <button
            onClick={handleCloseApp}
            title="Quit Application"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Search input */}
      {showSearch && (
        <div className="mt-2.5">
          <input
            type="text"
            placeholder="Search issues & tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      )}

      {/* One-time resync tip banner */}
      {locallyDeletedTasks.length > 0 && !hasSeenLocallyDeletedTip && (
        <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center space-x-1.5 min-w-0 pr-1">
            <Trash2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              You have {locallyDeletedTasks.length} locally hidden task(s). Click the trash icon to view or restore.
            </span>
          </div>
          <button
            onClick={dismissLocallyDeletedTip}
            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-800/60 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              filterSource === 'all'
                ? 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterSource('github')}
            className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition-all ${
              filterSource === 'github'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </button>
          <button
            onClick={() => setFilterSource('google_tasks')}
            className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition-all ${
              filterSource === 'google_tasks'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            <span>Google</span>
          </button>
        </div>
        
        <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 space-x-1">
          <Filter className="h-2.5 w-2.5" />
          <span>Widget Mode</span>
        </div>
      </div>
    </header>
  );
};
