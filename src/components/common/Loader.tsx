import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  label?: string;
}

export const Loader: React.FC<LoaderProps> = ({ label = 'Loading...' }) => (
  <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <p className="text-sm font-semibold">{label}</p>
  </div>
);
