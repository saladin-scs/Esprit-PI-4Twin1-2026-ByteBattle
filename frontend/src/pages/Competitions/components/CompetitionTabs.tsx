import { memo } from 'react';
import type { CompetitionTab } from '../types';

const TABS: { value: CompetitionTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'past', label: 'Past' },
];

interface CompetitionTabsProps {
  activeTab: CompetitionTab;
  onTabChange: (tab: CompetitionTab) => void;
  disabled?: boolean;
}

function CompetitionTabsComponent({ activeTab, onTabChange, disabled }: CompetitionTabsProps) {
  return (
    <div
      className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
      role="tablist"
      aria-label="Contest filters"
    >
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={activeTab === value}
          aria-controls={`panel-${value}`}
          id={`tab-${value}`}
          disabled={disabled}
          onClick={() => onTabChange(value)}
          className={`
            px-5 py-2.5 text-sm font-medium rounded-md transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
            disabled:opacity-50 disabled:cursor-not-allowed
            ${activeTab === value
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const CompetitionTabs = memo(CompetitionTabsComponent);
