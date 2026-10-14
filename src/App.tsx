import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { AddTaskModal } from './components/AddTaskModal';
import { SettingsModal } from './components/SettingsModal';
import { GitHubSetupModal } from './components/GitHubSetupModal';
import { useTaskStore } from './store/useTaskStore';

export const App: React.FC = () => {
  const { checkAuthStatus, hasCompletedOnboarding, setSettingsOpen } = useTaskStore();

  useEffect(() => {
    checkAuthStatus().then((status) => {
      if (!hasCompletedOnboarding && !status.has_github && !status.has_google) {
        setSettingsOpen(true);
      }
    });
  }, [checkAuthStatus, hasCompletedOnboarding, setSettingsOpen]);

  return (
    <div className="bg-white flex flex-col h-screen w-screen overflow-hidden rounded-2xl border border-slate-200 text-slate-800 shadow-xl">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <KanbanBoard />
      </main>
      <AddTaskModal />
      <SettingsModal />
      <GitHubSetupModal />
    </div>
  );
};

export default App;
