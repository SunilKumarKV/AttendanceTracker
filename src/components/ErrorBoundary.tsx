import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-red-900/50 dark:bg-slate-900 dark:shadow-none">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 dark:bg-red-950/50">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 dark:text-white">Something went wrong</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto dark:text-slate-300">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            aria-label="Refresh page"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw size={20} />
            Refresh Page
          </button>
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
                {error?.toString()}
              </p>
            </div>
          )}
          </div>
        </div>
      );
    }

    return children;
  }
}
