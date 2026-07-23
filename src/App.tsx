import React from 'react';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { AddTaskModal } from './components/AddTaskModal';

export const App: React.FC = () => {
  return (
    <div className="widget-glass flex flex-col h-screen w-screen overflow-hidden rounded-2xl border border-white/10 text-slate-100 shadow-2xl">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <KanbanBoard />
      </main>
      <AddTaskModal />
    </div>
  );
};

export default App;
