import { memo } from 'react';
import type { CompetitionTab } from '../types';
import { cn } from '../../../lib/utils';

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
    <div className="bb-tablist w-full max-w-md" role="tablist" aria-label="Contest filters">
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
          className={cn(
            'bb-tab-trigger flex-1 sm:flex-none',
            activeTab === value ? 'bb-tab-trigger-active' : 'bb-tab-trigger-inactive',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const CompetitionTabs = memo(CompetitionTabsComponent);
