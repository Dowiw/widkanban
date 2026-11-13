import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { DeadlineFilterOption, DeadlineSortOption } from '../types/task';
import { getDeadlineCounts } from '../utils/deadline';
import { 
  Clock, 
  ArrowUpDown, 
  AlertCircle, 
  Calendar, 
  CalendarDays, 
  CheckCircle2, 
  X,
  RotateCcw
} from 'lucide-react';

export const DeadlineFilterDropdown: React.FC = () => {
  const {
    tasks,
    deadlineFilter,
    setDeadlineFilter,
    deadlineSort,
    setDeadlineSort,
  } = useTaskStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const counts = getDeadlineCounts(tasks);
  const isFilterActive = deadlineFilter !== 'all';
  const isSortActive = deadlineSort !== 'none';
  const hasActiveControls = isFilterActive || isSortActive;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filterOptions: { id: DeadlineFilterOption; label: string; count?: number; icon: React.ReactNode; color?: string }[] = [
    { id: 'all', label: 'All Tasks', count: counts.total, icon: <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> },
    { 
      id: 'overdue', 
      label: 'Overdue', 
      count: counts.overdue, 
      icon: <AlertCircle className="h-3.5 w-3.5 text-rose-500" />,
      color: 'text-rose-600 dark:text-rose-400'
    },
    { 
      id: 'today', 
      label: 'Due Today', 
      count: counts.today, 
      icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
      color: 'text-amber-600 dark:text-amber-400'
    },
    { 
      id: 'this_week', 
      label: 'Due This Week', 
      count: counts.thisWeek, 
      icon: <Calendar className="h-3.5 w-3.5 text-indigo-500" />,
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    { 
      id: 'has_deadline', 
      label: 'Has Deadline', 
      count: counts.hasDeadline, 
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 
    },
    { 
      id: 'no_deadline', 
      label: 'No Deadline', 
      count: counts.total - counts.hasDeadline, 
      icon: <X className="h-3.5 w-3.5 text-slate-400" /> 
    },
  ];

  const sortOptions: { id: DeadlineSortOption; label: string; description: string }[] = [
    { id: 'none', label: 'Manual (Default)', description: 'Board drag order' },
    { id: 'soonest', label: 'Due Soonest', description: 'Earliest deadline first' },
    { id: 'latest', label: 'Latest First', description: 'Furthest deadline first' },
    { id: 'updated', label: 'Recently Updated', description: 'Newest changes first' },
    { id: 'alphabetical', label: 'Alphabetical (A-Z)', description: 'Sort by title' },
  ];

  const getButtonTitle = () => {
    if (isFilterActive && isSortActive) {
      return `Filter: ${deadlineFilter} · Sort: ${deadlineSort}`;
    }
    if (isFilterActive) return `Filter: ${deadlineFilter}`;
    if (isSortActive) return `Sort: ${deadlineSort}`;
    return 'Filter & Sort by Deadline';
  };

  return (
    <div ref={containerRef} className="relative inline-block no-drag">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={getButtonTitle()}
        className={`p-1.5 rounded-lg transition-all relative flex items-center space-x-1 ${
          hasActiveControls
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {counts.overdue > 0 && !hasActiveControls && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-1 ring-white dark:ring-slate-900" />
        )}
        {hasActiveControls && (
          <span className="text-[10px] font-medium tracking-tight pr-0.5 truncate max-w-[80px]">
            {isFilterActive
              ? deadlineFilter === 'overdue'
                ? 'Overdue'
                : deadlineFilter === 'today'
                ? 'Today'
                : deadlineFilter === 'this_week'
                ? 'This Week'
                : 'Filtered'
              : 'Sorted'}
          </span>
        )}
        <ArrowUpDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-semibold">Deadlines & Sorting</span>
            </div>
            {hasActiveControls && (
              <button
                type="button"
                onClick={() => {
                  setDeadlineFilter('all');
                  setDeadlineSort('none');
                }}
                className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-0.5 transition-colors"
                title="Reset all filters and sorting"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Section 1: Deadline Filter Presets */}
          <div className="pt-2">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1.5">
              Filter by Deadline
            </span>
            <div className="grid grid-cols-2 gap-1">
              {filterOptions.map((opt) => {
                const isSelected = deadlineFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDeadlineFilter(opt.id);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/70 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5 truncate">
                      {opt.icon}
                      <span className={`truncate ${opt.color || ''}`}>{opt.label}</span>
                    </span>
                    {typeof opt.count === 'number' && (
                      <span
                        className={`text-[9.5px] font-mono px-1 rounded ${
                          isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sorting Options */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1.5">
              Sort Board Columns
            </span>
            <div className="space-y-0.5">
              {sortOptions.map((s) => {
                const isSelected = deadlineSort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setDeadlineSort(s.id);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[9.5px] text-slate-400 dark:text-slate-500">{s.description}</span>
                    </div>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
