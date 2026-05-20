import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/80 ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 5 }) => (
  <div className="space-y-3 p-6" aria-label="Loading table">
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((__, column) => (
          <Skeleton key={column} className="h-10" />
        ))}
      </div>
    ))}
  </div>
);
