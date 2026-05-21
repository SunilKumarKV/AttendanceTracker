import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  actionLabel = 'Try again',
  onAction,
}) => (
  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
    <div className="mb-4 rounded-2xl bg-white p-4 text-red-500 shadow-sm dark:bg-red-950">
      <AlertTriangle className="h-10 w-10" />
    </div>
    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">{message}</p>
    {onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
      >
        <RefreshCw size={16} />
        {actionLabel}
      </button>
    ) : null}
  </div>
);
