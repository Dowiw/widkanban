import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { AddTaskModal } from './components/AddTaskModal';
import { SettingsModal } from './components/SettingsModal';
import { GitHubSetupModal } from './components/GitHubSetupModal';
import { DeleteTaskModal } from './components/DeleteTaskModal';
import { useTaskStore } from './store/useTaskStore';

export const App: React.FC = () => {
  const { 
    checkAuthStatus, 
    hasCompletedOnboarding, 
    setSettingsOpen,
    customization,
    isPinned,
    syncWindowResizable,
  } = useTaskStore();

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track system dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark =
    customization.theme === 'dark' ||
    (customization.theme === 'system' && systemIsDark);

  // Apply dark class to document.documentElement for global styling
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Initial resizability sync based on pin state
  useEffect(() => {
    syncWindowResizable(!isPinned);
  }, [isPinned, syncWindowResizable]);

  useEffect(() => {
    checkAuthStatus().then((status) => {
      if (!hasCompletedOnboarding && !status.has_github && !status.has_google) {
        setSettingsOpen(true);
      }
    });
  }, [checkAuthStatus, hasCompletedOnboarding, setSettingsOpen]);

  const fontClass =
    customization.fontFamily === 'unifont'
      ? 'font-unifont'
      : customization.fontFamily === 'mono'
      ? 'font-mono'
      : customization.fontFamily === 'system'
      ? 'font-system'
      : 'font-sans';

  const rootStyle: React.CSSProperties = {
    ['--widget-radius' as string]: `${customization.cornerRadius}px`,
    ['--col-radius' as string]: `${Math.max(0, Math.round(customization.cornerRadius * 0.75))}px`,
    ['--card-radius' as string]: `${Math.max(0, Math.round(customization.cornerRadius * 0.5))}px`,
    ['--col-header-height' as string]: `${customization.columnHeaderHeight}px`,
    ['--col-min-width' as string]: `${customization.columnMinWidth}px`,
  };

  return (
    <div
      style={rootStyle}
      className={`flex flex-col h-screen w-screen overflow-hidden rounded-widget border transition-colors duration-150 shadow-xl ${fontClass} ${
        isDark
          ? 'bg-slate-900 border-slate-700/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <KanbanBoard />
      </main>
      <AddTaskModal />
      <SettingsModal />
      <GitHubSetupModal />
      <DeleteTaskModal />
    </div>
  );
};

export default App;

