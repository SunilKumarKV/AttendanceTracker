import React from 'react';
import { Inbox, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No results found',
  message = 'There is nothing to show here yet.',
  actionLabel,
  onAction,
}) => (
  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
    <div className="mb-4 rounded-2xl bg-blue-50 p-4 text-blue-600 dark:bg-blue-500/10">
      <Inbox className="h-10 w-10" />
    </div>
    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
      >
        <PlusCircle size={16} />
        {actionLabel}
      </button>
    ) : null}
  </div>
);
