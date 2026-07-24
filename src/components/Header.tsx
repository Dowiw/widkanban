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
  Layers,
  Minus,
  X
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    filterSource, 
    setFilterSource, 
    searchQuery, 
    setSearchQuery, 
    isPinned, 
    togglePin, 
    setAddTaskOpen, 
    refreshTasks,
    tasks
  } = useTaskStore();

  const [showSearch, setShowSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ghCount = tasks.filter((t) => t.source === 'github').length;
  const gtCount = tasks.filter((t) => t.source === 'google_tasks').length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshTasks();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTogglePin = async () => {
    togglePin();
    try {
      await invoke('toggle_always_on_top');
    } catch {
      // Browser fallback
    }
  };

  const handleMinimizeWindow = async () => {
    try {
      await invoke('hide_window');
    } catch {
      console.log('Running in browser preview mode; hide ignored.');
    }
  };

  const handleCloseApp = async () => {
    try {
      await invoke('close_app');
    } catch {
      console.log('Running in browser preview mode; close ignored.');
    }
  };

  return (
    <header className="widget-drag-bar flex flex-col border-b border-white/10 bg-slate-950/70 p-3 select-none">
      {/* Top Bar with Drag Area */}
      <div 
        data-tauri-drag-region 
        className="flex items-center justify-between cursor-grab active:cursor-grabbing py-1"
      >
        {/* Brand & Stats */}
        <div data-tauri-drag-region className="flex items-center space-x-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-slate-100 uppercase">
              WidKanban
            </h1>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="flex items-center space-x-0.5">
                <Github className="h-2.5 w-2.5 text-emerald-400" />
                <span>{ghCount}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-0.5">
                <CheckSquare className="h-2.5 w-2.5 text-blue-400" />
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
              showSearch ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleRefresh}
            title="Refresh Sync"
            className={`p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${
              isRefreshing ? 'animate-spin text-indigo-400' : ''
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Always on top (Active)' : 'Always on top (Inactive)'}
            className={`p-1.5 rounded-md transition-colors ${
              isPinned ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-indigo-300' : ''}`} />
          </button>

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
            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition-colors ml-1"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Close / Quit Application (X) */}
          <button
            onClick={handleCloseApp}
            title="Quit Application"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
            className="w-full rounded-md bg-slate-900/80 border border-white/10 px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              filterSource === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterSource('github')}
            className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition-all ${
              filterSource === 'github'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </button>
          <button
            onClick={() => setFilterSource('google_tasks')}
            className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition-all ${
              filterSource === 'google_tasks'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            <span>Google</span>
          </button>
        </div>
        
        <div className="flex items-center text-[10px] text-slate-500 space-x-1">
          <Filter className="h-2.5 w-2.5" />
          <span>Widget Mode</span>
        </div>
      </div>
    </header>
  );
};
